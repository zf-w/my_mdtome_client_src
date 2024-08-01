import * as Three from "three";

class SceneInfo {
  html; // HTMLElement
  scene = new Three.Scene(); // Scene
  camera = new Three.PerspectiveCamera(); // PerspectiveCamera
  update_fn = undefined;

  constructor(html, scene, camera, update = undefined) {
    this.html = html;
    this.scene = scene;
    this.camera = camera;
    this.update_fn = update;
    this.keep = true;
  }

  update() {
    if (this.update_fn) {
      this.update_fn();
    }
  }
}

class San {
  sceneInfoList = [];
  canvas;
  renderer = undefined;
  dirty = false;
  empty_scene = new Three.Scene();
  black_camera = new Three.PerspectiveCamera();
  total = 0;

  renderSceneInfo(scene_info) {
    const { left, right, top, bottom, width, height } =
      scene_info.html.getBoundingClientRect();

    let parent = this.canvas.getBoundingClientRect();
    const tHeight = parent.height;
    const tWidth = parent.width;
    // console.log(left, right, top, bottom, height, width)
    if (bottom < 0 || top > tHeight || right < 0 || left > tWidth) {
      return;
    }
    const yTop = tHeight - bottom;
    //console.log(top);
    const camera = scene_info.camera;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    if (scene_info.update) {
      scene_info.update();
    }

    // this.renderer?.setScissorTest(true)

    this.renderer?.setScissor(left, yTop, width + 1, height + 1);
    //this.renderer.setViewport(0,0,100,100);
    this.renderer?.setViewport(left, yTop, width + 1, height + 1);
    //console.log(sceneInfo.scene.children.length);
    this.renderer?.render(scene_info.scene, scene_info.camera);
    // this.renderer?.clear()
    // this.renderer?.setScissorTest(false)
  }

  render() {
    if (this.dirty) {
      this.renderer?.setScissor(0, 0, window.innerWidth, window.innerHeight);
      this.renderer?.clear();
      this.renderer?.render(this.empty_scene, this.black_camera);
      this.dirty = false;
    }
    // this.renderer?.render(this.empty_scene, this.black_camera)
    for (let i = 0; i < this.sceneInfoList.length; ++i) {
      const curr_scene = this.sceneInfoList[i];
      if (curr_scene.keep) {
        this.renderSceneInfo(curr_scene);
        this.dirty = true;
      } else {
        // Render an empty one first to clear out the remains?
        curr_scene.scene = this.empty_scene;
        // scene.clear()
        // scene.background = new Color(0x00000000)
        this.renderSceneInfo(curr_scene);
        this.sceneInfoList.splice(i, 1);
      }
    }
  }

  handleResize() {
    // console.log('Resizing')
    const renderer = this.renderer;

    // Update sizes
    let width = window.innerWidth;
    let height = window.innerHeight;
    // if (this.canvas != undefined) {
    //   const box = this.canvas.getBoundingClientRect()
    //   console.log(box.width)
    //   width = box.width
    //   // height = box.height
    // }

    // Update renderer
    if (renderer != undefined) {
      renderer.setSize(width, height, false);

      // renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
  }

  constructor() {
    // console.log('Constructing San')
    // this.empty_scene.background = new Three.Color(0x000000);
  }

  init(canvas) {
    // console.log('Starting')

    window.addEventListener("resize", () => {
      this.handleResize();
    });
    if (this.renderer != undefined) {
      return;
    }
    this.canvas = canvas;
    this.renderer = new Three.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.autoClear = true;
    this.handleResize();
    const renderer = this.renderer;
    renderer.setScissorTest(true);
    // const updator = this.updator

    // AddGraphSet(scene, updator)
    const tick = () => {
      // Call tick again on the next frame

      this.render();

      window.requestAnimationFrame(tick);
    };

    tick();
  }

  add(sceneInfo) {
    // console.log('Adding')

    this.sceneInfoList.push(sceneInfo);
    this.total += 1;
    return this.total;
  }

  asyncAdd() {
    return (obj) => {
      this.add(obj);
    };
  }

  dispose() {
    this.renderer.dispose();
    this.renderer = undefined;
    this.canvas = undefined;
  }
}

const root_canvas = document.getElementById("$root-canvas");
const san_context = new San();
san_context.init(root_canvas);

window.mdbook.san_context = san_context;

export {SceneInfo}