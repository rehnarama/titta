struct GlobalUniforms {
    uProjectionMatrix: mat3x3<f32>,
    uWorldTransformMatrix: mat3x3<f32>,
    uWorldColorAlpha: vec4<f32>,
    uResolution: vec2<f32>,
};

struct LocalUniforms {
    uWorldOffset: vec2<f32>,
    uZoom: f32,
    uScreenSize: vec2<f32>,
    uGridSize: f32,
    uSubdivisions: f32,
    uLineColor: vec4<f32>,
    uBgColor: vec4<f32>,
};

@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;
@group(1) @binding(0) var<uniform> localUniforms: LocalUniforms;

struct VertexInput {
    @location(0) aPosition: vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) vScreenPos: vec2<f32>,
};

@vertex
fn mainVertex(input: VertexInput) -> VertexOutput {
    let worldTransformMatrix = globalUniforms.uWorldTransformMatrix;
    let projectionMatrix = globalUniforms.uProjectionMatrix;

    let worldPosition = worldTransformMatrix * vec3<f32>(input.aPosition, 1.0);
    let clipPosition = projectionMatrix * worldPosition;

    var output: VertexOutput;
    output.position = vec4<f32>(clipPosition.xy, 0.0, 1.0);
    // Pass screen-space pixel position (after mesh transform which scales unit quad to screen size)
    output.vScreenPos = worldPosition.xy;
    return output;
}

fn gridLine(coord: f32, lineWidth: f32) -> f32 {
    let d = abs(coord);
    let fw = fwidth(coord);
    let halfWidth = lineWidth * 0.5;
    return smoothstep(halfWidth + fw, halfWidth - fw, d);
}

@fragment
fn mainFragment(input: VertexOutput) -> @location(0) vec4<f32> {
    let screenPos = input.vScreenPos;
    let worldPos = (screenPos - localUniforms.uWorldOffset) / localUniforms.uZoom;

    let logBase = log2(localUniforms.uSubdivisions);
    let logZoom = log2(localUniforms.uZoom);
    let level = floor(logZoom / logBase);
    let t = fract(logZoom / logBase);

    let majorSpacing = localUniforms.uGridSize / pow(localUniforms.uSubdivisions, level);
    let minorSpacing = majorSpacing / localUniforms.uSubdivisions;

    // Distance to nearest major grid line (in world space)
    let majorCoordX = worldPos.x - round(worldPos.x / majorSpacing) * majorSpacing;
    let majorCoordY = worldPos.y - round(worldPos.y / majorSpacing) * majorSpacing;
    // Convert to screen space for consistent line width
    let majorScreenX = majorCoordX * localUniforms.uZoom;
    let majorScreenY = majorCoordY * localUniforms.uZoom;
    let majorLine = max(gridLine(majorScreenX, 1.0), gridLine(majorScreenY, 1.0));

    // Distance to nearest minor grid line (in world space)
    let minorCoordX = worldPos.x - round(worldPos.x / minorSpacing) * minorSpacing;
    let minorCoordY = worldPos.y - round(worldPos.y / minorSpacing) * minorSpacing;
    let minorScreenX = minorCoordX * localUniforms.uZoom;
    let minorScreenY = minorCoordY * localUniforms.uZoom;
    let minorLine = max(gridLine(minorScreenX, 1.0), gridLine(minorScreenY, 1.0));

    let majorAlpha = localUniforms.uLineColor.a;
    let minorAlpha = localUniforms.uLineColor.a * t;

    let lineAlpha = max(majorLine * majorAlpha, minorLine * minorAlpha);
    let color = mix(localUniforms.uBgColor, vec4<f32>(localUniforms.uLineColor.rgb, 1.0), lineAlpha);

    return vec4<f32>(1.0, 0.0, 0.0, 1.0); //color;
}
