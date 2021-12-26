precision highp float;

varying vec3 fNormal;
varying vec3 fPosition;
varying vec3 fViewer;

uniform mat4 mView; // view transformation
uniform mat4 mViewNormals; // view transf. for vectors

const int MAX_LIGHTS = 8;

struct LightInfo {
    vec3 pos;
    vec3 Ia;
    vec3 Id;
    vec3 Is;
    bool isDirectional;
    bool isActive;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform int uNLights; // Effective number of lights used
uniform LightInfo uLight[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo uMaterial; // The material of the object being drawn


void main() {

    vec3 Ifinal = vec3(0.0, 0.0, 0.0);

    vec3 N = normalize(fNormal);
    vec3 V = normalize(fViewer);

    for(int i=0; i<MAX_LIGHTS; i++) {

        if(i == uNLights) break;

        if(uLight[i].isActive){
 
            vec3 L;

            if(uLight[i].isDirectional){ 
                L = normalize((mViewNormals * vec4(uLight[i].pos, 0.0)).xyz);
            } else {
                L = normalize((mView * vec4(uLight[i].pos, 1.0)).xyz - fPosition);
            }
                    
            vec3 R = normalize(reflect(-L,N));

            vec3 ambientColor = uLight[i].Ia * uMaterial.Ka;
            vec3 diffuseColor = uLight[i].Id * uMaterial.Kd;
            vec3 specularColor = uLight[i].Is * uMaterial.Ks;

            float diffuseFactor = max( dot(L,N), 0.0 );
            vec3 diffuse = diffuseFactor * diffuseColor;

            float specularFactor = pow(max(dot(V,R), 0.0), uMaterial.shininess);
            vec3 specular = specularFactor * specularColor;

            Ifinal = Ifinal + (ambientColor + diffuse + specular);
        }

    }

    gl_FragColor = vec4(Ifinal, 1.0);


}