var renderer = null, 
scene = null, 
camera = null,
root = null,
robot_idle = null,
group = null;

var deadAnimator = null;

var raycaster;
var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;

var robots = [],
game = false,
score = 0,
highScore = 0,
spawn = 0,
nRobots = 0,
cont = 0,
id = 0,
duration = 60,
clock = null,
currentTime = Date.now();


var directionalLight = null;
var spotLight = null;
var ambientLight = null;
var mapUrl = "./images/4.jpg";

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

function createScene(canvas) {
    
    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );

    // Set the viewport size
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Turn on shadows
    renderer.shadowMap.enabled = true;
    // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create a new Three.js scene
    scene = new THREE.Scene();

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera( 45, canvas.width / canvas.height, 1, 4000 );
    camera.position.set(0, 145,120);
    camera.rotation.set(-45,0,0);

    scene.add(camera);

    //orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        
    // Create a group to hold all the objects
    root = new THREE.Object3D;
    
    spotLight = new THREE.SpotLight (0xffffff);
    spotLight.position.set(-30, 8, -10);
    spotLight.target.position.set(-2, 0, -2);
    root.add(spotLight);

    spotLight.castShadow = true;

    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.camera.fov = 45;
    
    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    ambientLight = new THREE.AmbientLight ( 0x888888 );
    root.add(ambientLight);
    
    // Create the objects
    loadFBX();

    // Create a group to hold the objects
    group = new THREE.Object3D;
    root.add(group);

    // Create a texture map
    var map = new THREE.TextureLoader().load(mapUrl);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 8);

    var color = 0xffffff;

    // Put in a ground plane to show off the lighting
    geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}));

    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4.02;
    
    // Add the mesh to our group
    group.add( mesh );
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    
    // Now add the group to our scene
    scene.add( root );

    raycaster = new THREE.Raycaster();

    document.addEventListener('mousedown', onDocumentMouseDown);
    window.addEventListener( 'resize', onWindowResize);

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseDown(event) {
    event.preventDefault();
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    // find intersections
    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(scene.children, true);
    
    if ( intersects.length > 0 ) {
        CLICKED = intersects[ 0 ].object;
        
        if(CLICKED.parent.name != "") {
            if(!deadAnimator.running) {
                for(var i = 0; i<= deadAnimator.interps.length - 1; i++) {
                    deadAnimator.interps[i].target = robots[CLICKED.parent.name].rotation;
                    robots[CLICKED.parent.name].time_dead = Date.now();
                    robots[CLICKED.parent.name].alive = 0;
                }
                playAnimations();
            }

            
        }
    }
    else{
        CLICKED = null;
    }
}

function run() {
    requestAnimationFrame(function() { run(); });
    // Render the scene
    renderer.render(scene, camera);
    animate();
}

function animate() {
    if ( game ){
        var now = Date.now();
        var deltat = clock.getDelta() * 1000;
        currentTime = now;
        generateGame(deltat);
        KF.update();
    }
}

function startGame() {
    
    score = 0;
    spawn = 0;
    id = 0;
    nRobots = 4;

    if(robots.length > 0){
        for(var i = 0; i < robots.length; i++){
            scene.remove(robots[i]);
        }   
    }

    robots = [];
    document.getElementById("btn-start").hidden = true;
    document.getElementById("score").innerHTML = "Score: " + score;
    document.getElementById("timer").innerHTML = 60;
    document.getElementById("overlay").hidden = true;

    clock = new THREE.Clock();
    game = true;

}

function generateGame(deltat){
    var seconds = Math.floor(duration - clock.elapsedTime);
        if (seconds > 0){
            updateTimer(seconds);

        }
        else{
            seconds = 0;
            game = false;

            updateHighScore();

            document.getElementById("timer").innerHTML = "¡GAME FINISHED!";
            document.getElementById("btn-start").hidden = false;
            document.getElementById("btn-start").value = "Restart Game";
            document.getElementById("overlay").hidden = false;
        }

        if (spawn < nRobots){
            cloneRobot();
            if (id > 0){
                spawn ++;
            }
        }

        if ( robots.length > 0) {
            for(var i = 1; i < robots.length; i++){
                robots[i].mixer.update( ( deltat ) * 0.002 );
                robots[i].position.z += 0.015 * deltat;

                if (robots[i].alive == 0){
                    if(currentTime - robots[i].time_dead > 1000)  {
                        if(robots[i].score == 1){
                            robots[i].score = 0;
                            updateScore(1);
                            spawn--;
                            scene.remove(robots[i]);
                            cont ++;
                            
                            if (cont % 2 == 0){
                                nRobots ++;
                                //console.log("Spawneando ", nRobots - 1, "robots");
                            }

                        }
                    }
                }

                if (robots[i].alive == 1){
                    if(robots[i].position.z > 90 ) {   
                        if(robots[i].score == 1){
                            robots[i].score = 0;
                            updateScore(-1);
                            spawn--;
                            scene.remove(robots[i]);
                        }
                    } 
                }
                
            }
        }
}

function cloneRobot() {
    var x = getRandomArbitrary(95, -95);
    var z = getRandomArbitrary(-100, -105);

    var clone = cloneFbx(robot_idle);

    clone.position.set(x, -4, z);

    clone.name = id;
    clone.score = 1;
    clone.alive = 1;
    clone.time_dead = 0;

    clone.mixer =  new THREE.AnimationMixer( scene );
    var action = clone.mixer.clipAction( clone.animations[ 0 ], clone ).play();

    scene.add(clone);
    robots.push(clone);
    
    if (id == 0){
        scene.remove(robots[0]);
    }
    id ++;
}

function loadFBX() {
    mixer = new THREE.AnimationMixer( scene );

    var loader = new THREE.FBXLoader();
    loader.load( './models/Robot/robot_walk.fbx', function ( object ) {
        object.mixer = new THREE.AnimationMixer( scene );
        var action = object.mixer.clipAction( object.animations[ 0 ], object );
        object.scale.set(0.02, 0.02, 0.02);
        action.play();
        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );
        robot_idle = object;
        createDeadAnimation();
    } );
}

function createDeadAnimation() {
    deadAnimator = new KF.KeyFrameAnimator;
        deadAnimator.init({ 
            interps:
                [
                    { 
                        keys:[0, 0.166, 0.332, 0.498, 0.644, 0.800, 1], 
                        values:[
                            { y : 0.00, z : 0.00 },
                            { y : 0.15, z : -0.20 },
                            { y : 0.30, z : -0.40 },
                            { y : 0.45, z : -0.60 },
                            { y : 0.60, z : -0.80 },
                            { y : 0.75, z : -1.00 },
                            { y : 0.90, z : -1.30 },
                            ],
                    },
                ],
            loop: false,
            duration: 1 * 1000,
        });
}

function playAnimations() {
    deadAnimator.start();
}

function updateTimer(seconds) {
    document.getElementById("timer").innerHTML = "Timer: " + seconds;
}

function updateScore(n) {
    score = score + (n);
    document.getElementById("score").innerHTML = "Score: " + score;
}

function updateHighScore() {
    if (highScore < score){
        highScore = score;
        document.getElementById("high-score").innerHTML = "High Score: " + highScore;
    }
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}