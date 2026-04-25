import {
  GlProgram,
  GpuProgram,
  Mesh,
  MeshGeometry,
  Shader,
  UniformGroup,
  Color,
} from "pixi.js";

import gridWgsl from "./grid.wgsl?raw";
import gridVert from "./grid.vert.glsl?raw";
import gridFrag from "./grid.frag.glsl?raw";

const LINE_COLOR = new Color("#d0d3d8");
const BG_COLOR = new Color("#eff1f5");
const LINE_ALPHA = 0.6;
const GRID_SIZE = 100;
const SUBDIVISIONS = 4;

export class GridBackground extends Mesh<MeshGeometry, Shader> {
  private gridUniforms: UniformGroup;

  constructor() {
    const geometry = new MeshGeometry({
      positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });

    const gpuProgram = GpuProgram.from({
      vertex: { source: gridWgsl, entryPoint: "mainVertex" },
      fragment: { source: gridWgsl, entryPoint: "mainFragment" },
    });

    const glProgram = GlProgram.from({
      vertex: gridVert,
      fragment: gridFrag,
    });

    const gridUniforms = new UniformGroup({
      uWorldOffset: { value: new Float32Array([0, 0]), type: "vec2<f32>" },
      uZoom: { value: 1, type: "f32" },
      uScreenSize: { value: new Float32Array([1, 1]), type: "vec2<f32>" },
      uGridSize: { value: GRID_SIZE, type: "f32" },
      uSubdivisions: { value: SUBDIVISIONS, type: "f32" },
      uLineColor: {
        value: new Float32Array([
          LINE_COLOR.red,
          LINE_COLOR.green,
          LINE_COLOR.blue,
          LINE_ALPHA,
        ]),
        type: "vec4<f32>",
      },
      uBgColor: {
        value: new Float32Array([
          BG_COLOR.red,
          BG_COLOR.green,
          BG_COLOR.blue,
          1.0,
        ]),
        type: "vec4<f32>",
      },
    });

    const shader = new Shader({
      gpuProgram,
      glProgram,
      resources: {
        localUniforms: gridUniforms,
      },
    });

    super({ geometry, shader });

    this.gridUniforms = gridUniforms;
    this.eventMode = "static";
    this.cursor = "default";
  }

  resizeGrid(width: number, height: number): void {
    this.scale.set(width, height);
    (this.gridUniforms.uniforms as Record<string, unknown>).uScreenSize =
      new Float32Array([width, height]);
  }

  syncGrid(zoom: number, offsetX: number, offsetY: number): void {
    const u = this.gridUniforms.uniforms as Record<string, unknown>;
    u.uZoom = zoom;
    u.uWorldOffset = new Float32Array([offsetX, offsetY]);
  }
}
