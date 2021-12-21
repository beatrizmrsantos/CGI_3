import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, scale, lookAt, flatten, vec3, vec4, subtract, perspective, normalMatrix, transpose, inverse, rotate, add, mult } from "../../libs/MV.js";
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

let lights = [];   //lights array

let nLights = 4;   //number of light being draw: it can be change

const MAX_LIGHTS = 8;
const ESCALE_RGB = 1/255;
const LIGHT_SCALE = 0.07;
const FLOOR_HEIGHT = 0.1;
const FLOOR_LENGTH = 3.0;
const FLOOR_TRANSLATION = 0.5;


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    mode = gl.TRIANGLES;

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    let program2 = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shaderLight.frag"]);


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

    let groundMaterial = {
        Ka: [25,25,25],
        Kd: [100,100,100],
        Ks: [255,255,255],
        shininess: 50
    }

    let object = {
        object: 'Sphere'
    }

    if(nLights > MAX_LIGHTS) nLights = MAX_LIGHTS;

    update_mView();
    update_mProjection();


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
        
        for(let i = 0; i < nLights; i++){
            let x = -(nLights - 1)/2;
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
    

        for(let i=0; i < nLights; i++){
    
            const lightGui = lightsGui.addFolder("Light" + (i+1));
    
            const position = lightGui.addFolder("position");
            position.add(lights[i].pos, 0).name("x").step(0.05);
            position.add(lights[i].pos, 1).name("y").step(0.05);
            position.add(lights[i].pos, 2).name("z").step(0.05);
    
            lightGui.addColor(lights[i], "Ia").name("ambient");
            lightGui.addColor(lights[i], "Id").name("diffuse");
            lightGui.addColor(lights[i], "Is").name("specular");
    
            lightGui.add(lights[i], "isDirectional").name("directional");
            lightGui.add(lights[i], "isActive").name("active");
    
        }

    }


    function update_mView(){
        mView = lookAt(camera.eye, camera.at, camera.up);
    }

    function update_mProjection(){
        mProjection = perspective(camera.fovy, aspect, camera.near, camera.far);
    }
      
    function uploadModelView(p){
        gl.uniformMatrix4fv(gl.getUniformLocation(p, "mModelView"), false, flatten(modelView()));
        
    }

    //draw the object
    function drawObject(){

        multTranslation([0,FLOOR_TRANSLATION*FLOOR_HEIGHT,0]);

        uploadModelView(program);

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

    //draw the floor
    function drawFloor(){

        multTranslation([0, -FLOOR_TRANSLATION, 0]);
        multScale([FLOOR_LENGTH, FLOOR_HEIGHT, FLOOR_LENGTH]);

        uploadModelView(program);

        CUBE.draw(gl, program, mode);

    }

    //draw the light
    function drawLight(i){

        let lightpos = lights[i].pos;

        multTranslation([lightpos[0],lightpos[1],lightpos[2]]);
        multScale([LIGHT_SCALE, LIGHT_SCALE, LIGHT_SCALE]);

        gl.uniform3fv(gl.getUniformLocation(program2, "uColor"), scale(ESCALE_RGB, lights[i].Is));

        uploadModelView(program2);
        
        SPHERE.draw(gl, program2, mode);
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


    function resize_canvas()
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
        update_mProjection();

        optionsEnabler();

        loadMatrix(mView);
        

        putUniformMatrixs();
        putIniformLights();
        
        putUniformMaterial(groundMaterial);
        pushMatrix();
            drawFloor();
        popMatrix();

        putUniformMaterial(material);
        pushMatrix();
            drawObject();
        popMatrix();


        gl.useProgram(program2);

        gl.uniformMatrix4fv(gl.getUniformLocation(program2, "mProjection"), false, flatten(mProjection));

        if(options.show_lights){
            for(let i = 0; i <nLights; i++){
                pushMatrix();
                    drawLight(i);
                popMatrix();
            }
        }
 
    }


    function putUniformMatrixs(){
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(modelView()))); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mView"), false, flatten(mView));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mViewNormals"), false, flatten(normalMatrix(mView)));  
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

    }

    function putUniformMaterial(m){
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ka"), flatten(scale(ESCALE_RGB,m.Ka)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Kd"), flatten(scale(ESCALE_RGB,m.Kd)));
        gl.uniform3fv(gl.getUniformLocation(program, "uMaterial.Ks"), flatten(scale(ESCALE_RGB,m.Ks)));
        gl.uniform1f(gl.getUniformLocation(program, "uMaterial.shininess"), m.shininess);

    }

    function putIniformLights(){
        gl.uniform1i(gl.getUniformLocation(program, "uNLights"), nLights);

        for(let i = 0; i < nLights; i++){
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + i + "].pos"), flatten(lights[i].pos));
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + i + "].Ia"), flatten(scale(ESCALE_RGB,lights[i].Ia)));
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + i + "].Id"), flatten(scale(ESCALE_RGB,lights[i].Is)));
            gl.uniform3fv(gl.getUniformLocation(program, "uLight[" + i + "].Is"), flatten(scale(ESCALE_RGB, lights[i].Is)));
            gl.uniform1i(gl.getUniformLocation(program, "uLight[" + i + "].isDirectional"), lights[i].isDirectional);
            gl.uniform1i(gl.getUniformLocation(program, "uLight[" + i + "].isActive"), lights[i].isActive);
        }
    }

}

const urls = ["shader.vert", "shader.frag", "shaderLight.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))