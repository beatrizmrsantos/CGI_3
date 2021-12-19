precision mediump float;

varying vec3 fNormal;
varying vec3 fPosition;

/*
varying vec3 fReflect;
varying vec3 fLight;
varying vec3 fViewer;
*/

uniform mat4 mView; // view transformation
uniform mat4 mViewNormals; // view transf. for vectors

uniform vec3 uColor;

uniform bool uIsLight;

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

    if( uIsLight ){

            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);

        } else {

            vec3 Ifinal = vec3(0.0, 0.0, 0.0);

            vec3 N = normalize(fNormal);

            for(int i=0; i<MAX_LIGHTS; i++) {

                if(i == uNLights) break;

                if(uLight[i].isActive){
 
                    vec3 L;
                    vec4 posLight;

                    if(uLight[i].isDirectional){ 
                        posLight = vec4(uLight[i].pos, 0.0);
                        L = normalize((mViewNormals * posLight).xyz);
                    } else {
                        posLight = vec4(uLight[i].pos, 1.0);
                        L = normalize((mView * posLight).xyz - fPosition);
                    }
                    
                    vec3 V = normalize(-fPosition);
                    vec3 R = normalize(reflect(-L,N));


                    vec3 ambientColor = uLight[i].Ia * uMaterial.Ka;
                    vec3 diffuseColor = uLight[i].Id * uMaterial.Kd;
                    vec3 specularColor = uLight[i].Is * uMaterial.Ks;


                    float diffuseFactor = max( dot(L,N), 0.0 );

                    vec3 diffuse = diffuseFactor * diffuseColor;

                    float specularFactor = pow(max(dot(V,R), 0.0), uMaterial.shininess);

                    vec3 specular = specularFactor * specularColor;

                    if( dot(L,N) < 0.0 ) {
                        specular = vec3(0.0, 0.0, 0.0);
                    }

                    Ifinal = Ifinal + (ambientColor + diffuse + specular);
                }

            }

            gl_FragColor = vec4(Ifinal, 1.0);
        }


}