attribute vec4 vPosition; 
attribute vec4 vNormal;

uniform mat4 mModelView;// model-view transformation
uniform mat4 mProjection; // projection matrix
uniform mat4 mNormals; // model-view transformation for normals

varying vec3 fNormal;
varying vec3 fPosition;
varying vec3 fViewer;


void main(){

    vec3 posC = (mModelView * vPosition).xyz;

    fPosition = posC;
    fNormal = (mNormals * vNormal).xyz;
    fViewer = -posC;

    gl_Position = mProjection * mModelView * vPosition;
    
}
