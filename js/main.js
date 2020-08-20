var app = new Vue({
    el: '#app',
    data: {
      substances: [
          { name: "Sodium Chloride", formula: "NaCl", common_state: "solid" },
          { name: "Water", formula: "H<sub>2</sub>O", common_state: "liquid" },
          { name: "Oxygen", formula: "O<sub>2</sub>", common_state: "gas" },
      ]
    },
    methods: {
        'removeAllSubstances': function(event) {
            while(this.substances.length > 0) {this.substances.pop();}
        },
        'removeSubstanceIndex': function(idx) {
            this.substances.splice(idx, 1)
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

