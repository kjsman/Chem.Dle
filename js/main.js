var app = new Vue({
    el: '#app',
    data: {
      substances: [
          { name: "Sodium Chloride", formula: "NaCl", qty: 2, mw: 58.44, cid: 5234},
          { name: "Water", formula: "H2O", qty: 5, mw: 18.015, cid: 962},
          { name: "Oxygen", formula: "O2", qty: 8, mw: 31.999, cid: 977},
      ],
      modalActived: "",
      keywordTextSearch: "",
      resultTextSearch: [],
      isNoResultTextSearch: false,
      isRunningTextSearch: false
    },
    watch: {
        keywordTextSearch: function() {
            this.isRunningTextSearch = true
            this.isNoResultTextSearch = false
            while (this.resultTextSearch.length) this.resultTextSearch.pop()
            if (this.keywordTextSearch) this.runDebouncedTextSearch()
            else {
                this.isRunningTextSearch = false
                clearTimeout(this.runDebouncedTextSearch.timeout)
            }
        }
    },
    created: function () {
        this.runDebouncedTextSearch = debounce(this.runTextSearch, 500)
    },
    methods: {
        formatMolecularFormula: function(formula) {
            return formula.replace(/([)a-zA-Z])(\d+)/g, "$1<sub>$2</sub>").replace(/([+-]\d*)$/, "<sup>$1</sup>")
        },
        removeAllSubstances: function() {
            while(this.substances.length > 0) {this.substances.pop();}
        },
        removeSubstanceByIndex: function(idx) {
            this.substances.splice(idx, 1)
        },
        closeModal: function() {
            this.modalActived = ""
        },
        openMetaSelectModal: function() {
            this.modalActived = "metaSelect"
        },
        openTextSearchModal: function() {
            this.isRunningTextSearch = false
            this.isNoResultTextSearch = false
            this.keywordTextSearch = ""
            while (this.resultTextSearch.length) this.resultTextSearch.pop()

            this.modalActived = "textSearch"
        },
        runTextSearch: async function() {
            var startKeyword = this.keywordTextSearch
            if (!startKeyword) return
            resp = await axios.get(`https://pubchem.ncbi.nlm.nih.gov/unified_search/structure_search.cgi?format=json&queryblob=%7B%22query%22%3A%7B%22type%22%3A%22validity%22%2C%22parameter%22%3A%5B%7B%22name%22%3A%22Query%22%2C%22string%22%3A%22${encodeURIComponent(startKeyword)}%22%7D%5D%7D%7D`)
            if (resp.data.response.status != 0) {
                validity = [{valid: false}, {valid: false}, {valid: false}]
            }
            else validity = resp.data.response.validity
            if (validity[2].valid) { // Formula
                if (startKeyword != this.keywordTextSearch) return
                resp = await axios.get(`https://pubchem.ncbi.nlm.nih.gov/unified_search/structure_search.cgi?format=json&queryblob=%7B%22query%22%3A%7B%22type%22%3A%22formula%22%2C%22parameter%22%3A%5B%7B%22name%22%3A%22FormulaQuery%22%2C%22string%22%3A%22${encodeURIComponent(startKeyword)}%22%7D%2C%7B%22name%22%3A%22UseCache%22%2C%22bool%22%3Atrue%7D%2C%7B%22name%22%3A%22SearchTimeMsec%22%2C%22num%22%3A5000%7D%2C%7B%22name%22%3A%22SearchMaxRecords%22%2C%22num%22%3A100000%7D%2C%7B%22name%22%3A%22allowotherelements%22%2C%22bool%22%3Afalse%7D%5D%7D%7D`)
                cachekey = resp.data.response.cachekey
                var query = {
                    "select": "*",
                    "collection": "compound",
                    "where": {"ands": [{
                        "input": {"type": "netcachekey", "idtype": "cid", "key": cachekey
                    }}]},
                    "order": ["relevancescore,desc"],
                    "start": 1,
                    "limit": 10,
                    "width": 1000000,
                    "listids": 0
                }
            } else if (validity[0].valid) { // SMILES
                if (startKeyword != this.keywordTextSearch) return
                resp = await axios.get(`https://pubchem.ncbi.nlm.nih.gov/unified_search/structure_search.cgi?format=json&queryblob=%7B%22query%22%3A%7B%22type%22%3A%22identity%22%2C%22parameter%22%3A%5B%7B%22name%22%3A%22SMILES%22%2C%22string%22%3A%22${encodeURIComponent(startKeyword)}%22%7D%2C%7B%22name%22%3A%22UseCache%22%2C%22bool%22%3Atrue%7D%2C%7B%22name%22%3A%22identity_type%22%2C%22string%22%3A%22same_stereo_isotope%22%7D%5D%7D%7D`)
                if (resp.data.response.status != 0) {
                    validity[0].valid = 0
                } else {
                    cachekey = resp.data.response.cachekey
                    var query = {
                        "select": "*",
                        "collection": "compound",
                        "where": {"ands": [{
                            "input": {"type": "netcachekey", "idtype": "cid", "key": cachekey
                        }}]},
                        "order": ["relevancescore,desc"],
                        "start": 1,
                        "limit": 10,
                        "width": 1000000,
                        "listids": 0
                    }
                }
            } 
            if (!(validity[0].valid || validity[2].valid)) {
                var query = {
                    "select": "*",
                    "collection": "compound",
                    "where": {"ands": [{"*": startKeyword}]},
                    "order": ["relevancescore,desc"],
                    "start": 1,
                    "limit": 10,
                    "width": 1000000,
                    "listids": 0
                }
            }
            if (startKeyword != this.keywordTextSearch) return
            resp = await axios.get(`https://pubchem.ncbi.nlm.nih.gov/sdq/sdqagent.cgi?infmt=json&outfmt=json&query=${encodeURIComponent(JSON.stringify(query))}`)
            this.isRunningTextSearch = false
            var results = resp.data.SDQOutputSet[0].rows
            if (startKeyword != this.keywordTextSearch) return
            if (results.length == 0) {
                this.isNoResultTextSearch = true
            } else {
                this.resultTextSearch = results.filter((q) => q.cmpdname)
                this.isNoResultTextSearch = false
            }
        },
        addSubstanceFromTextSearch: function(index) {
            var substance = this.resultTextSearch[index]
            this.substances.push({'name': substance.cmpdname, 'formula': substance.mf, 'qty': 1, 'mw': substance.mw, 'cid': substance.cid})
            this.closeModal()
        }
    }
  })

var container = document.getElementById('main-canvas');

var w = container.offsetWidth;
var h = container.offsetHeight;

var renderer = new THREE.WebGLRenderer( { canvas: container } );
renderer.setSize(w, h);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, w / h, 0.1, 1000 );

var geometry = new THREE.BoxGeometry();
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

var animate = function () {
    requestAnimationFrame( animate );

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render( scene, camera );
};

animate();

