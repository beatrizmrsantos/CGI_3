import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, subtract, perspective, transpose, inverse, rotate, add, mult } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationY, multScale, multTranslation, popMatrix, pushMatrix} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';

import * as dat from '../../libs/dat.gui.module.js';

/** @type WebGLRenderingContext */
let gl;

let move = false;

let x1,y1;

let mode; 
//let normal = vec3(0,0,0);             

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
        aspect: 1,
        near: 0.1,
        far: 20
    }

    let options = {
        wireframe: false,
        normals: true
    }

    mView = lookAt(camera.eye, camera.at, camera.up);

    mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);

    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "wireframe");
    optionsGui.add(options, "normals");

    const cameraGui = gui.addFolder("camera");
    cameraGui.add(camera, "fovy").min(1).max(100).step(1).listen();
    cameraGui.add(camera, "aspect").min(0).max(10).listen().domElement.style.pointerEvents = "none";
  

    cameraGui.add(camera, "near").min(0.1).max(20).listen().onChange(function (v){
        camera.near = Math.min(camera.far-0.5, v);
    });

    cameraGui.add(camera, "far").min(0.1).max(20).listen().onChange(function (v){
        camera.far = Math.max(camera.near+0.5, v);
    });

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.05).listen().domElement.style.pointerEvents = "none";
    eye.add(camera.eye, 1).step(0.05).listen().domElement.style.pointerEvents = "none";
    eye.add(camera.eye, 2).step(0.05).listen().domElement.style.pointerEvents = "none";

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).listen().domElement.style.pointerEvents = "none";
    at.add(camera.at, 1).step(0.05).listen().domElement.style.pointerEvents = "none";
    at.add(camera.at, 2).step(0.05).listen().domElement.style.pointerEvents = "none";

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.05).listen().domElement.style.pointerEvents = "none";
    up.add(camera.up, 1).step(0.05).listen().domElement.style.pointerEvents = "none";
    up.add(camera.up, 2).step(0.05).listen().domElement.style.pointerEvents = "none";

    
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

    window.addEventListener('mousedown', e => {
        x1 = e.offsetX;
        y1 = e.offsetY;
        move = true;
        
    });

    window.addEventListener('mousemove', e => {
        let x2, y2;
        if(move){
            x2 = e.offsetX;
            y2 = e.offsetY;

            if(x1 != x2 || y1 != y2){
                moveCamera(x1, y1, x2, y2); 
            }

            x1 = x2;
            y1 = y2;
        }
        
    
    });

    window.addEventListener('mouseup', e => {
        x1 = 0;
        y1 = 0;
        move = false;
    });

    function moveCamera(x1, y1, x2, y2){
        let v1 = subtract(camera.eye, camera.at);
        let v2 = subtract(camera.up, camera.eye);

        let e = vec4(v1[0], v1[1], v1[2], 0);
        let p = vec4(v2[0], v2[1], v2[2], 0);

        let pat = vec4(camera.at[0], camera.at[1], camera.at[2], 1);
        //let peye = vec4(camera.eye[0], camera.eye[1], camera.eye[2], 1);

        let eye = add(pat, mult(inverse(mView), mult(rotate(1, vec3(y1-y2, x1-x2, 0)), mult(mView, e))));
        let up = add(eye, mult(inverse(mView), mult(mView, p)));

        camera.eye[0] = eye[0];
        camera.eye[1] = eye[1];
        camera.eye[2] = eye[2];
        
        camera.up[0] = up[0];
        camera.up[1] = up[1];
        camera.up[2] = up[2];

    }


    function update_mView(){
        mView = lookAt(camera.eye, camera.at, camera.up);
    }

    function update_camera(){

        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    }
        

    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function cube()
    {
        //multTranslation([0,0,-5]);
        //multScale([2, 2, 2]);
        //multRotationY(360*time/SUN_DAY);

        uploadModelView();

        CUBE.draw(gl, program, gl.LINES);
    }

    function sphere()
    {
        //multTranslation([0,0,-5]);
        //multScale([0.3, 0.3, 0.3]);
        
        //multRotationY(360*time/SUN_DAY);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    

    function render()
    {
      
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        update_mView();
        update_options();
        update_camera();

        loadMatrix(mView);
        
        //let mNormals = transpose(inverse(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(modelView()))); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection)); 
        gl.uniform1i(gl.getUniformLocation(program, "uUseNormals"), options.normals);
        

        pushMatrix();
            cube();
        popMatrix();
        pushMatrix();
            sphere();
        popMatrix();
        
    }


    function update_options(){

        if(options.wireframe){
            mode = gl.LINES; 
        } else {
            mode = gl.TRIANGLES;
        }

    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))