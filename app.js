import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, subtract, perspective, normalMatrix, transpose, inverse, rotate, add, mult } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationY, multScale, multTranslation, popMatrix, pushMatrix } from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';

import * as dat from '../../libs/dat.gui.module.js';

/** @type WebGLRenderingContext */
let gl;
let mode;            

let aspect;
let mProjection;
let mView;


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);


    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    SPHERE.init(gl);
    CUBE.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);


    let camera = {
        eye: vec3(0,0,5),
        at: vec3(0,0,0),
        up: vec3(0,1,0),
        fovy: 45,
        near: 1.5,
        far: 20
    }

    let options = {
        backface_culling: true,
        depth_test: true,
        show_lights: true
    }

    let light1 = {
        pos: vec3(0,1,0),
        ambient: [75,75,75],
        diffuse: [175,175,175],
        specular: [255,255,255],
        directional: false,
        active: true
    }

    let material = {
        Ka: [0,25,0],
        Kd: [0,100,0],
        Ks: [255,255,255],
        shininess: 50
    }

    let object = {
        object: "Sphere"
    }

    mView = lookAt(camera.eye, camera.at, camera.up);

    mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);

    const gui = new dat.GUI();
    const guiObject = new dat.GUI();

    guiObject.add(object, "object", ['Cube', 'Sphere', 'Cylinder', 'Pyramid', 'Torus']);

    const materialGui = guiObject.addFolder("material");
    materialGui.addColor(material, "Ka");
    materialGui.addColor(material, "Kd");
    materialGui.addColor(material, "Ks");
    materialGui.add(material, "shininess").min(1.0);

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "backface_culling").name("backface culling");
    optionsGui.add(options, "depth_test");
    optionsGui.add(options, "show_lights");

    const cameraGui = gui.addFolder("camera");
    cameraGui.add(camera, "fovy").min(1).max(100).step(1).listen();

    cameraGui.add(camera, "near").min(0.1).max(20).listen().onChange(function (v){
        camera.near = Math.min(camera.far-0.5, v);
    });

    cameraGui.add(camera, "far").min(0.1).max(20).listen().onChange(function (v){
        camera.far = Math.max(camera.near+0.5, v);
    });

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.05).listen();
    eye.add(camera.eye, 1).step(0.05).listen();
    eye.add(camera.eye, 2).step(0.05).listen();

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).listen();
    at.add(camera.at, 1).step(0.05).listen();
    at.add(camera.at, 2).step(0.05).listen();

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).min(-1).max(1).step(0.01).listen();;
    up.add(camera.up, 1).min(-1).max(1).step(0.01).listen();;
    up.add(camera.up, 2).min(-1).max(1).step(0.01).listen();;

    const lightsGui = gui.addFolder("Lights");
    
    const light1Gui = lightsGui.addFolder("Light1");

    const position1 = light1Gui.addFolder("position");
    position1.add(light1.pos, 0).step(0.05).listen();
    position1.add(light1.pos, 1).step(0.05).listen();
    position1.add(light1.pos, 2).step(0.05).listen();

    position1.addColor(light1, "ambient");
    position1.addColor(light1, "diffuse");
    position1.addColor(light1, "specular");

    position1.add(light1, "directional");
    position1.add(light1, "active");


    
    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    window.addEventListener("wheel", event => {
        const delta = Math.sign(event.deltaY);
        
        if(event.shiftKey){ //event.ctrlKey
            if((camera.eye[2] + delta*0.1) >= camera.at[2] )
                camera.eye[2] += delta*0.1;

        }else if(event.altKey) {
            camera.eye[2] += delta*0.1;
            camera.at[2] += delta*0.1;
        }
        else{
            if(!( (camera.fovy == 1 && delta < 0) || (camera.fovy == 100 && delta > 0) ) )
                camera.fovy += delta;
        }

    });


    function update_mView(){
        mView = lookAt(camera.eye, camera.at, camera.up);
    }

    function update_camera(){
        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    }
      
    function uploadModelView(){
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    }


    function draw() {

        uploadModelView();



        SPHERE.draw(gl, program, mode);
    }

    function render(){
      
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        update_mView();
        update_camera();

        loadMatrix(mView);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(modelView()))); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection)); 
        gl.uniform1i(gl.getUniformLocation(program, "uUseNormals"), options.normals);
        

        
    }

}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))