import * as Three from 'three';
import * as San from 'san';

function render_graph(canvas_elem, graph, config) {
  const scene = new Three.Scene();
  // scene.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial({color: 0xff0000})))

  const camera = new Three.PerspectiveCamera(75, 1.0, 0.01, 10);
  camera.position.z = 2.0;
  if (config.camera_dis != undefined) {
    camera.position.z = config.camera_dis;
  }

  const pos_list = graph.position.data;

  let Dim = graph.position.dim;
  const size = pos_list.length / Dim;

  let pos_arr = new Float32Array(size * 3);
  if (Dim == 2) {
    for (let i = 0; i < size; ++i) {
      const i2 = i * 2;
      const i3 = i * 3;
      pos_arr[i3] = pos_list[i2];
      pos_arr[i3 + 1] = pos_list[i2 + 1];
    }
  } else {
    for (let i = 0; i < size; ++i) {
      const id = i * Dim;
      const i3 = i * 3;
      pos_arr[i3] = pos_list[id];
      pos_arr[i3 + 1] = pos_list[id + 1];
      pos_arr[i3 + 2] = pos_list[id + 2];
    }
  }
  const pos_att = new Three.BufferAttribute(pos_arr, 3);
  const geometry = new Three.BufferGeometry();
  geometry.setAttribute("position", pos_att);
  geometry.setIndex(graph.index);
  const material = new Three.LineBasicMaterial({ color: 0xdb2777 });
  const obj = new Three.LineSegments(geometry, material);
  scene.add(obj);

  const control = new Three.OrbitControls(camera, canvas_elem);
  control.enableZoom = false;
  control.enablePan = false;
  control.autoRotate = true;
  control.autoRotateSpeed = 0.1;
  let last_update = Date.now();
  const test = new San.SceneInfo(canvas_elem, scene, camera, () => {
    let now = Date.now();
    control.update((now - last_update) / 1000);
    last_update = now;
  });

  window.mdbook.san_context.add(test);
}
  
export function render(id_string, curr_data) {
  const curr_element = document.getElementById(id_string)
  const res = window.mdbook.fetch_static_json_helper(curr_data.path)
  if (res.data != undefined) {
    render_graph(curr_element, res.data, curr_data)
  } else {
    res.then((graph) => {
      render_graph(curr_element, res.data, curr_data)
    });
  }
}
  