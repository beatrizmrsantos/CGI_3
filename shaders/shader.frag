precision highp float;

varying vec3 fNormal;

uniform bool uUseNormals;

void main() {
    vec3 c = vec3(1.0, 1.0, 1.0);

    if( uUseNormals )
        c = 0.5 * (fNormal + vec3(1.0, 1.0, 1.0));

    //vec3 c = fNormal + vec3(1.0, 1.0, 1.0);
    gl_FragColor = vec4(c, 1.0);
}