import path from "path";

import schema from "./options.json";
import {
  getSassImplementation,
  getSassOptions,
  getWebpackImporter,
  getRenderFunctionFromSassImplementation,
  normalizeSourceMap,
} from "./utils";
import SassError from "./SassError";

/**
 * The sass-loader makes node-sass and dart-sass available to webpack modules.
 *
 * @this {object}
 * @param {string} content
 */
async function loader(content, sourceMap, meta) {
  // 获取到options配置
  const options = this.getOptions(schema);
  // 异步loader
  const callback = this.async();
  // 获取到解析sass的方法
  const implementation = getSassImplementation(this, options.implementation);

  if (!implementation) {
    callback();

    return;
  }

  // 是否使用source map
  const useSourceMap =
    typeof options.sourceMap === "boolean" ? options.sourceMap : this.sourceMap;
  // 对sass进行相关配置
  const sassOptions = await getSassOptions(
    this,
    options,
    content,
    implementation,
    useSourceMap
  );
  const shouldUseWebpackImporter =
    typeof options.webpackImporter === "boolean"
      ? options.webpackImporter
      : true;

  if (shouldUseWebpackImporter) {
    const { includePaths } = sassOptions;

    sassOptions.importer.push(
      getWebpackImporter(this, implementation, includePaths)
    );
  }

  const render = getRenderFunctionFromSassImplementation(implementation);

  render(sassOptions, (error, result) => {
    if (error) {
      // There are situations when the `file` property do not exist
      if (error.file) {
        // `node-sass` returns POSIX paths
        this.addDependency(path.normalize(error.file));
      }

      callback(new SassError(error));

      return;
    }

    let map = result.map ? JSON.parse(result.map) : null;

    // Modify source paths only for webpack, otherwise we do nothing
    if (map && useSourceMap) {
      map = normalizeSourceMap(map, this.rootContext);
    }

    // 遍历监听scss文件
    result.stats.includedFiles.forEach((includedFile) => {
      const normalizedIncludedFile = path.normalize(includedFile);

      // Custom `importer` can return only `contents` so includedFile will be relative
      if (path.isAbsolute(normalizedIncludedFile)) {
        this.addDependency(normalizedIncludedFile);
      }
    });

    callback(null, result.css.toString(), map);
  });
}

export default loader;
