import { QgisXYZDataSource, QgisCanvasDataSource } from "@qgis-js/ol";

import Map from "ol/Map.js";
import View from "ol/View.js";

import WebGLTileLayer from "ol/layer/WebGLTile.js";
import ImageLayer from "ol/layer/Image";

import XYZ from "ol/source/XYZ.js";

import Projection from "ol/proj/Projection.js";

import {
  ScaleLine,
  FullScreen,
  defaults as defaultControls,
} from "ol/control.js";

// import("ol/ol.css");

const animationDuration = 500;

const useBaseMap = true;

export function olDemoXYZ(target, api) {
  let view = undefined;
  let map = undefined;
  let layer = undefined;
  let source = undefined;

  const getBbox = () => {
    const initioalSrid = api.srid();
    const initialExtent = api.fullExtent();
    return initioalSrid === "EPSG:3857"
      ? initialExtent
      : api.transformRectangle(initialExtent, initioalSrid, "EPSG:3857");
  };

  const init = () => {
    target.innerHTML = "";

    const center = getBbox().center();

    view = new View({
      center: [center.x, center.y],
      zoom: 10,
    });

    source = new QgisXYZDataSource(api, {
      debug: false,
      extentBufferFactor: () => {
        return 4.0;
      },
    });

    (layer = new WebGLTileLayer({
      source,
    })),
      (map = new Map({
        target,
        view,
        controls: defaultControls().extend([new ScaleLine(), new FullScreen()]),
        layers: [
          layer,
          new WebGLTileLayer({
            visible: useBaseMap,
            source: new XYZ({
              url: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`,
            }),
            style: {
              saturation: ["var", "saturation"],
              variables: {
                saturation: -0.75,
              },
            },
          }),
        ].reverse(),
      }));

    map.once("precompose", function (_event) {
      // fit the view to the extent of the data once the map gets actually rendered
      update();
    });
  };

  const update = () => {
    const bbox = getBbox();
    view.fit([bbox.xMinimum, bbox.yMinimum, bbox.xMaximum, bbox.yMaximum], {
      duration: animationDuration,
      padding: [10, 10, 10, 10],
    });
    setTimeout(() => {
      render();
    }, 0);
  };

  const render = () => {
    source?.clear();
    layer?.getRenderer()?.clearCache();
    layer?.changed();
  };

  const xyzBaseMapCheckbox = document.getElementById("xyzBaseMap");
  if (xyzBaseMapCheckbox) {
    xyzBaseMapCheckbox.addEventListener("change", () => {
      if (map)
        map.getLayers().getArray()[0].setVisible(xyzBaseMapCheckbox.checked);
    });
  }

  init();

  return {
    init,
    update,
    render,
  };
}

export function olDemoCanvas(target, api) {
  let view = undefined;
  let srid = undefined;
  let map = undefined;
  let layer = undefined;
  let source = undefined;

  const init = () => {
    target.innerHTML = "";

    srid = api.srid();

    const projection = new Projection({
      code: srid,
      // TODO map unit of QgsCoordinateReferenceSystem to ol unit
      // https://api.qgis.org/api/classQgsCoordinateReferenceSystem.html#ad57c8a9222c27173c7234ca270306128
      // https://openlayers.org/en/latest/apidoc/module-ol_proj_Units.html
      units: "m",
    });

    const bbox = api.fullExtent();
    const center = bbox.center();

    view = new View({
      projection,
      center: [center.x, center.y],
      zoom: 10,
    });

    source = new QgisCanvasDataSource(api, {
      projection,
    });

    layer = new ImageLayer({
      source,
    });

    map = new Map({
      target,
      view,
      controls: defaultControls().extend([new ScaleLine(), new FullScreen()]),
      layers: [layer],
    });

    map.once("precompose", function (_event) {
      const bbox = api.fullExtent();
      view.fit([bbox.xMinimum, bbox.yMinimum, bbox.xMaximum, bbox.yMaximum], {
        duration: animationDuration,
      });
    });
  };

  // recreate the entire map on each update to get new projections working
  const update = () => {
    init();
  };

  const render = () => {
    setTimeout(() => {
      // recreate the source to force reload the image in the layer
      source = new QgisCanvasDataSource(api, {
        projection: new Projection({
          code: srid,
          units: "m",
        }),
      });
      layer?.setSource(source);
    }, 0);
  };

  init();

  return {
    init,
    update,
    render,
  };
}
