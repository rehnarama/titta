#version 300 es

in vec2 aPosition;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;

out vec2 vScreenPos;

void main()
{
    vec3 worldPosition = uWorldTransformMatrix * vec3(aPosition, 1.0);
    vec3 clipPosition = uProjectionMatrix * worldPosition;
    gl_Position = vec4(clipPosition.xy, 0.0, 1.0);
    // Pass screen-space pixel position (after mesh transform which scales unit quad to screen size)
    vScreenPos = worldPosition.xy;
}
