#version 300 es
precision highp float;

uniform vec2 uWorldOffset;
uniform float uZoom;
uniform vec2 uScreenSize;
uniform float uGridSize;
uniform float uSubdivisions;
uniform vec4 uLineColor;
uniform vec4 uBgColor;

in vec2 vScreenPos;
out vec4 fragColor;

float gridLine(float coord, float lineWidth)
{
    float d = abs(coord);
    float fw = fwidth(coord);
    float halfWidth = lineWidth * 0.5;
    return smoothstep(halfWidth + fw, halfWidth - fw, d);
}

void main()
{
    vec2 screenPos = vScreenPos;
    vec2 worldPos = (screenPos - uWorldOffset) / uZoom;

    float logBase = log2(uSubdivisions);
    float logZoom = log2(uZoom);
    float level = floor(logZoom / logBase);
    float t = fract(logZoom / logBase);

    float majorSpacing = uGridSize / pow(uSubdivisions, level);
    float minorSpacing = majorSpacing / uSubdivisions;

    // Distance to nearest major grid line (in world space)
    float majorCoordX = worldPos.x - round(worldPos.x / majorSpacing) * majorSpacing;
    float majorCoordY = worldPos.y - round(worldPos.y / majorSpacing) * majorSpacing;
    // Convert to screen space for consistent line width
    float majorScreenX = majorCoordX * uZoom;
    float majorScreenY = majorCoordY * uZoom;
    float majorLine = max(gridLine(majorScreenX, 1.0), gridLine(majorScreenY, 1.0));

    // Distance to nearest minor grid line (in world space)
    float minorCoordX = worldPos.x - round(worldPos.x / minorSpacing) * minorSpacing;
    float minorCoordY = worldPos.y - round(worldPos.y / minorSpacing) * minorSpacing;
    float minorScreenX = minorCoordX * uZoom;
    float minorScreenY = minorCoordY * uZoom;
    float minorLine = max(gridLine(minorScreenX, 1.0), gridLine(minorScreenY, 1.0));

    float majorAlpha = uLineColor.a;
    float minorAlpha = uLineColor.a * t;

    float lineAlpha = max(majorLine * majorAlpha, minorLine * minorAlpha);
    vec4 color = mix(uBgColor, vec4(uLineColor.rgb, 1.0), lineAlpha);

    fragColor = color;
}
