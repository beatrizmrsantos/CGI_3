attribute vec4 vPosition; 
attribute vec4 vNormal;

/*
uniform mat4 mView; // view transformation
uniform mat4 mViewNormals; // view transf. for vectors
*/

uniform mat4 mModelView;// model-view transformation
uniform mat4 mProjection; // projection matrix
uniform mat4 mNormals; // model-view transformation for normals

varying vec3 fNormal;
varying vec3 fPosition;

/*
varying vec3 fViewer;
varying vec3 fLight;
varying vec3 fReflect;
*/

void main(){

/*
    vec3 L;

    if(lightPosition.w == 0.0) 
        L = normalize((mViewNormals*lightPosition).xyz);
    else 
        L = normalize((mView*lightPosition).xyz - posC;
    
    vec3 V = normalize(-posC);
    vec3 N = normalize( (mNormals * vNormal).xyz);
    vec3 R = normalize(reflect(-L,N));

    fNormal = N;
    fPosition = posC;
    fLight = L;
    fViewer = V;
    fReflect = R;
*/

    vec3 posC = (mModelView * vPosition).xyz;
    
    fNormal = (mNormals * vNormal).xyz;
    fPosition = posC;

    gl_Position = mProjection * mModelView * vPosition;
    
}
