import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, subtract, perspective, normalMatrix, transpose, inverse, rotate, add, mult } from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationY, multScale, multTranslation, popMatrix, pushMatrix } from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';
import * as PYRAMID from '../../libs/pyramid.js';

import * as dat from '../../libs/dat.gui.module.js';

/** @type WebGLRenderingContext */
let gl;
let mode;            

let aspect;
let mProjection;
let mView;

let lights = [];

const NLIGHTS = 3;


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    mode = gl.TRIANGLES;
    //mode = gl.LINES;

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);


    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    SPHERE.init(gl);
    CYLINDER.init(gl);
    CUBE.init(gl);
    TORUS.init(gl);
    PYRAMID.init(gl);
    
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

    let material = {
        Ka: [0,25,0],
        Kd: [0,100,0],
        Ks: [255,255,255],
        shininess: 50
    }

    let object = {
        object: 'Sphere'
    }

    mView = lookAt(camera.eye, camera.at, camera.up);

    mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);

    const gui = new dat.GUI();
    const guiObject = new dat.GUI();

    guiObject.add(object, "object", ['Sphere', 'Cube', 'Cylinder', 'Pyramid', 'Torus']);

    addMaterialField();

    addOptionsFields();

    addCameraFields();

    addLights();



    optionsEnabler();

    
    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    window.addEventListener("wheel", event => {
        const delta = Math.sign(event.deltaY);
        
        if(event.shiftKey){ //event.ctrlKey
            if(delta > 0){
                camera.eye[2] += 0.1;
            } 

            if(delta < 0){
                if((camera.eye[2] - 0.1) >= camera.at[2]){
                    camera.eye[2] -= 0.1;
                }
            }

        }else if(event.altKey) {
            if(delta > 0){
                camera.eye[2] += 0.1;
                camera.at[2] += 0.1;
            } 

            if(delta < 0){
                camera.eye[2] -= 0.1;
                camera.at[2] -= 0.1;
            }
            
        } else{
            if(!( (camera.fovy == 1 && delta < 0) || (camera.fovy == 100 && delta > 0) ) )
                camera.fovy += delta;
        }

    });

    function addMaterialField(){
        const materialGui = guiObject.addFolder("material");
        materialGui.addColor(material, "Ka");
        materialGui.addColor(material, "Kd");
        materialGui.addColor(material, "Ks");
        materialGui.add(material, "shininess").min(1.0);

    }

    function addOptionsFields(){
        const optionsGui = gui.addFolder("options");
        optionsGui.add(options, "backface_culling").name("backface culling");
        optionsGui.add(options, "depth_test").name("depth test");
        optionsGui.add(options, "show_lights").name("show lights");

    }

    function addCameraFields(){

        const cameraGui = gui.addFolder("camera");
        cameraGui.add(camera, "fovy").min(1).max(100).step(1).listen();

        cameraGui.add(camera, "near").min(0.1).max(20).listen().onChange(function (v){
            camera.near = Math.min(camera.far-0.5, v);
        });

        cameraGui.add(camera, "far").min(0.1).max(20).listen().onChange(function (v){
            camera.far = Math.max(camera.near+0.5, v);
        });

        const eye = cameraGui.addFolder("eye");
        eye.add(camera.eye, 0).name("x").step(0.05).listen();
        eye.add(camera.eye, 1).name("y").step(0.05).listen();
        eye.add(camera.eye, 2).name("z").step(0.05).listen();

        const at = cameraGui.addFolder("at");
        at.add(camera.at, 0).name("x").step(0.05).listen();
        at.add(camera.at, 1).name("y").step(0.05).listen();
        at.add(camera.at, 2).name("z").step(0.05).listen();

        const up = cameraGui.addFolder("up");
        up.add(camera.up, 0).name("x").min(-1).max(1).step(0.01).listen();
        up.add(camera.up, 1).name("y").min(-1).max(1).step(0.01).listen();
        up.add(camera.up, 2).name("z").min(-1).max(1).step(0.01).listen();

    }

    function addLights(){
        const lightsGui = gui.addFolder("Lights");

        for(let i = 0; i < NLIGHTS; i++){
            let x = -1;
            let light = {
                pos: vec3(x + i,1,0),
                Ia: [75,75,75],
                Id: [175,175,175],
                Is: [255,255,255],
                isDirectional: false,
                isActive: true
            };
    
            lights[i] = light;
        }
    

        for(let i=0; i < NLIGHTS; i++){
    
            const lightGui = lightsGui.addFolder("Light" + (i+1));
    
            const position = lightGui.addFolder("position");
            position.add(lights[i].pos, 0).name("x").step(0.05);
            position.add(lights[i].pos, 1).name("y").step(0.05);
            position.add(lights[i].pos, 2).name("z").step(0.05);
    
            position.addColor(lights[i], "Ia").name("ambient");
            position.addColor(lights[i], "Id").name("diffuse");
            position.addColor(lights[i], "Is").name("specular");
    
            position.add(lights[i], "isDirectional").name("directional");
            position.add(lights[i], "isActive").name("active");
    
        }

    }


    function update_mView(){
        mView = lookAt(camera.eye, camera.at, camera.up);
    }

    function update_camera(){
        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    }
      
    function uploadModelView(){
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function draw(){

        multTranslation([0,0.5*0.1,0]);

        gl.uniform1i(gl.getUniformLocation(program, "uIsLight"), false);
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), vec3(0.0,0.0,1.0));

        uploadModelView();

        switch (object.object) {
            case 'Cube':
                CUBE.draw(gl, program, mode);
            break;
            case "Sphere":
                SPHERE.draw(gl, program, mode);
            break;
            case 'Cylinder':
                CYLINDER.draw(gl, program, mode);
            break;
            case 'Pyramid':
                PYRAMID.draw(gl, program, mode);
            break;
            case 'Torus':
                TORUS.draw(gl, program, mode);
            break;
            default:
        }


    }

    function drawFloor(){

        multTranslation([0,-0.5,0]);
        multScale([3,0.1,3]);

        gl.uniform1i(gl.getUniformLocation(program, "uIsLight"), false);
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), vec3(1.0,0.0,0.0));

        uploadModelView();
        CUBE.draw(gl, program, mode);

    }

    function drawLight(i){

        let lightpos = lights[i].pos;

        multTranslation([lightpos[0],lightpos[1],lightpos[2]]);
        multScale([0.07,0.07,0.07]);

        gl.uniform1i(gl.getUniformLocation(program, "uIsLight"), true);

        uploadModelView();
        SPHERE.draw(gl, program, mode);
    }

    function optionsEnabler(){

        if(options.backface_culling){
            gl.enable(gl.CULL_FACE);

            let face = gl.FRONT | gl.BACK;
            gl.cullFace(face);
            
        } else {
            gl.disable(gl.CULL_FACE);
        }

        if(options.depth_test){
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }

        
    }


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    }


    function render(){
      
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        update_mView();
        update_camera();

        optionsEnabler();

        loadMatrix(mView);
        
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(modelView()))); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mView"), false, flatten(mView));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mViewNormals"), false, flatten(normalMatrix(mView)));  
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
        
        gl.uniform1i(gl.getUniformLocation(program, "uNLights"), NLIGHTS);
        putIniformLights();
        putUniformMaterial();

        
        pushMatrix();
            drawFloor();
        popMatrix();
        pushMatrix();
            draw();
        popMatrix();

        if(options.show_lights){
            for(let i = 0; i <NLIGHTS; i++){
                pushMatrix();
                    drawLight(i);
                popMatrix();
            }
        }
 
    }

    function putUniformMaterial(){
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), material.Ka);
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), material.Kd);
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), material.Ks);
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), material.shininess);

    }

    function putIniformLights(){
        for(let i = 0; i < NLIGHTS; i++){
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + i + "].pos"), lights[i].pos);
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + i + "].Ia"), lights[i].Ia);
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + i + "].Id"), lights[i].Is);
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + i + "].Is"), lights[i].Is);
            gl.uniform1i(gl.getUniformLocation(program, "uLight[" + i + "].isDirectional"), lights[i].isDirectional);
            gl.uniform1i(gl.getUniformLocation(program, "uLight[" + i + "].isActive"), lights[i].isActive);
        }
    }

}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))