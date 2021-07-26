## Webpack中的那些事
### loader
### 目录
- 什么是Loader？它是做什么的？
- Loader的开发准则
- 介绍Loader
- 通过sass-loader、postcss-loader、css-loader、style-loader了解loader
- 实现一个自己的loader
### loader 是什么？它是做什么的？
loader 只是一个导出为函数的 JavaScript 模块，它会在Webpack构建过程中通过loader runner调用，对指定的资源文件代码进行处理，最终生成符合Webpack解析的Javascript字符串或者Buffer。
### loader开发准则 
#### 1.简单易用。  
loaders 应该只做单一任务。这不仅使每个 loader 易维护，也可以在更多场景链式调用。
#### 2.使用链式传递。  
利用 loader 可以链式调用的优势。写五个简单的 loader 实现五项任务，而不是一个 loader 实现五项任务。功能隔离不仅使 loader 更简单，可能还可以将它们用于你原先没有想到的功能。
#### 3.模块化的输出。 
保证输出模块化。loader 生成的模块与普通模块遵循相同的设计原则。
#### 4.确保无状态。 
确保 loader 在不同模块转换之间不保存状态。每次运行都应该独立于其他编译模块以及相同模块之前的编译结果。
#### 5.使用 loader utilities。 
充分利用loader-utils包。它提供了许多有用的工具，但最常用的一种工具是获取传递给 loader 的选项。schema-utils 包配合 loader-utils，用于保证 loader 选项，进行与 JSON Schema 结构一致的校验
#### 6.记录 loader 的依赖。
如果一个 loader 使用外部资源（例如，从文件系统读取），必须声明它。这些信息用于使缓存 loaders 无效，以及在观察模式(watch mode)下重编译。
#### 7.解析模块依赖关系。
根据模块类型，可能会有不同的模式指定依赖关系。例如在 CSS 中，使用 @import 和 url(...) 语句来声明依赖。这些依赖关系应该由模块系统解析。  
可以通过以下两种方式中的一种来实现：  
 - 通过把它们转化成 require 语句。 
 - 使用 this.resolve 函数解析路径。  
css-loader 是第一种方式的一个例子。它将 @import 语句替换为 require 其他样式文件，将 url(...) 替换为 require 引用文件，从而实现将依赖关系转化为 require 声明。 
对于 less-loader，无法将每个 @import 转化为 require，因为所有 .less 的文件中的变量和混合跟踪必须一次编译。因此，less-loader 将 less 编译器进行了扩展，自定义路径解析逻辑。然后，利用第二种方式，通过 webpack 的 this.resolve 解析依赖。
#### 8.提取通用代码。
避免在 loader 处理的每个模块中生成通用代码。相反，你应该在 loader 中创建一个运行时文件，并生成 require 语句以引用该共享模块。
#### 9.避免绝对路径。
不要在模块代码中插入绝对路径，因为当项目根路径变化时，文件绝对路径也会变化。loader-utils 中的 stringifyRequest 方法，可以将绝对路径转化为相对路径。
#### 10.使用 peer dependencies。  
如果你的 loader 简单包裹另外一个包，你应该把这个包作为一个 peerDependency 引入。这种方式允许应用程序开发者在必要情况下，在 package.json 中指定所需的确定版本。
### loader 种类
- pre(前置)
- normal(默认)
- inline(行内)
- post(后置)  

可在配置文件中通过Rule.enforce属性指定loader的类型。默认为空，表示normal；值可为pre和post。
```javascript
    rules: [
        {
            test: /\.(sass|scss)$/i,
            use: [
                'style-loader',
                'css-lodaer',
                'postcss-loader',
                'sass-loader'
            ],
            enforce: 'post',
        }
    ]
```
|前缀|描述|
|---|---|
|!|禁止配置中的normal loader|
|!!|禁止配置中的所有loader|
|-!|禁止配置中的pre loader和normal loader|
### 同步/异步 loader
#### 同步 loader：  
```javascript
// 同步loader
module.exports = function(content, map, meta) {
  return someSyncOperation(content);
};
// or
module.exports = function(content, map, meta) {
    // 第一个参数必须是 Error 或者 null
    // 第二个参数是一个 string 或者 Buffer。
    // 可选的：第三个参数必须是一个可以被这个模块解析的 source map。
    // 可选的：第四个选项，会被 webpack 忽略，可以是任何东西（例如一些元数据）。
    this.callback(null, someSyncOperation(content), map, meta);
    return;
};
```
如果是单个处理结果，可以在 同步模式 中直接返回。如果有多个处理结果，则必须调用 this.callback()。  
#### 异步 loader：
```javascript
module.exports = function(content, map, meta) {
  var callback = this.async();

  someAsyncOperation(content, function(err, result, sourceMaps, meta) {
    if (err) return callback(err);
    // 参数与this.callback方法一致
    callback(null, result, sourceMaps, meta);
  });
};
```
在 异步模式 中，必须调用 this.async()来告知 loader runner 等待异步结果，它会返回 this.callback() 回调函数。随后 loader 必须返回 undefined 并且调用该回调函数。  

`loader 最初被设计为可以在同步 loader pipeline（如 Node.js ，使用 enhanced-require），与异步 pipeline（如 webpack ）中运行。然而在 Node.js 这样的单线程环境下进行耗时长的同步计算不是个好主意，我们建议尽可能地使你的 loader 异步化。但如果计算量很小，同步 loader 也是可以的。`
#### 参数
第一个 loader 的传入参数只有一个：资源文件(resource file)的内容。compiler 需要得到最后一个 loader 产生的处理结果。这个处理结果应该是 String 或者 Buffer（被转换为一个 string），代表了模块的 JavaScript 源码。另外还可以传递一个可选的 SourceMap 结果（格式为 JSON 对象）。
### loader pitch
loader 总是从右到左地被调用。有些情况下，loader 只关心 request 后面的元数据(metadata)，并且忽略前一个 loader 的结果。在实际（从右到左）执行 loader 之前，会先从左到右调用 loader 上的 pitch 方法。对于以下 use 配置：
```javascript
{

    test: /\.(sass|scss)$/i,
    use: [
        'style-loader',
        'css-lodaer',
        'postcss-loader',
        'sass-loader'
    ]
}
```
将会发生下面的步骤：
```javascript
|- style-loader `pitch`
  |- css-loader `pitch`
    |- postcss-loader `pitch`
        |- sass-lodaer `pitch`
            |- 被匹配的资源内容
        |- sass-lodaer normal execution
    |- postcss-loader normal execution
  |- css-loader normal execution
|- style-loader normal execution
```
pitch可以用来跳过
#### pitch 参数
remainingRequest：  
当前loader右侧的所有loader加上资源路径，根据!分割，连接而成的内联loader。

precedingRequest：  
当前loader左侧的所有loader，根据!分割，连接而成的内联loader。

data：  
在 pitch 阶段和 normal 阶段之间共享的 data 对象。即：pitch阶段的参数data和normal阶段通过this.data获取的data为同一对象。
```javascript
module.exports = function (content) {
    // 与pitch中的data共享
    console.log(this.data.name); // pitch
};

module.exports.pitch = function (remainingRequest, precedingRequest, data) {
    data.name = 'pitch';
};
```
同时pitch也可以用来跳过loader，如果某个 loader 在 pitch 方法中return一个结果，那么这个过程会回过身来，并跳过剩下的 loader。在我们上面的例子中，如果 css-loader 的 pitch 方法返回了一些东西：
```javascript

module.exports.pitch = function (remainingRequest, precedingRequest, data) {
    if (isJump) {
        return "module.exports = require(" + JSON.stringify("-!" + remainingRequest) + ");";
    }
}
```
上面的步骤会被缩短为：
```javascript
|- style-loader `pitch`
    |- 返回一个module
|- style-loader normal execution
```
查看[bundle-loader](https://github.com/webpack-contrib/bundle-loader)，了解如何以更有意义的方式使用此过程。

#### loader row
默认情况下，资源文件会被转化为 UTF-8 字符串，然后传给 loader。通过设置 raw，loader 可以接收原始的 Buffer。每一个 loader 都可以用 String 或者 Buffer 的形式传递它的处理结果。Complier 将会把它们在 loader 之间相互转换。
```javascript
module.exports = function(content) {
    // 这个时候content传入的是Buffer类型的数据
    return someSyncOperation(content);
};

module.exports.raw = true;
```
### loader API
关于loader的API其他这里不做过多的阐述，大家可以通过官方文档
[API](https://www.webpackjs.com/api/loaders/)进行参阅；

### loader是如何进行工作的
#### sass-loader
`sass-loader/src/index.js`：  
```javascript
export default async function loader (content) {
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
    // ...
   
    // 根据配置生成render方法
    const render = getRenderFunctionFromSassImplementation(implementation);
    // 根据options配置对将sass代码转换成css
    render(sassOptions, (error, result) => {
        result.stats.incluededFiles.forEach((includedFile) => {
          const normalizedIncludedFile = path.normalize(includedFile);
        
            // 是否是绝对路径
          if (path.isAbsolute(normalizedIncludedFile)) {
            // 监听scss文件
            this.addDependency(normalizedIncludedFile);
          }
        });
        
        // 返回编译后的content以及sourceMap
        callback(null, result.css.toString(), map);
    });
};
```  
sass-loader的主要作用就是通过读取用户配置的options进行判断是使用`node-sass`还是使用`dart-sass`将代码编译成css。  
`postcss-loader/src/index.js`：
```
export default async function loader(content, sourceMap, meta) {
    const options = this.getOptions(schema);
    const callback = this.async();
    const configOption =
        typeof options.postcssOptions === "undefined" ||
        typeof options.postcssOptions.config === "undefined"
          ? true
          : options.postcssOptions.config;
    // 获取到postcss的工厂函数
    const postcssFactory = getPostcssImplementation(this, options.implementation);
    
    if (!postcssFactory) {
        callback(
            new Error(
            `The Postcss implementation "${options.implementation}" not found`
            )
        );
    
        return;
    }
    
    let loadedConfig;
    
    if (configOption) {
        try {
            loadedConfig = await loadConfig(
                this,
                configOption,
                options.postcssOptions
            );
        } catch (error) {
            callback(error);
            
            return;
        }
    }
    
    const useSourceMap =
        typeof options.sourceMap !== "undefined"
          ? options.sourceMap
          : this.sourceMap;
    
    const { plugins, processOptions } = await getPostcssOptions(
        this,
        loadedConfig,
        options.postcssOptions
    );
    
    if (useSourceMap) {
        processOptions.map = {
            inline: false,
            annotation: false,
            ...processOptions.map,
        };
    }
    
    if (sourceMap && processOptions.map) {
        processOptions.map.prev = normalizeSourceMap(sourceMap, this.context);
    }
    
    let root;
    
    // Reuse PostCSS AST from other loaders
    if (
        meta &&
        meta.ast &&
        meta.ast.type === "postcss" &&
        satisfies(meta.ast.version, `^${postcssPackage.version}`)
    ) {
        ({ root } = meta.ast);
    }
    
    if (!root && options.execute) {
        // eslint-disable-next-line no-param-reassign
        content = exec(content, this);
    }
    
    let result;
    let processor;
    
    try {
        processor = postcssFactory(plugins);
        result = await processor.process(root || content, processOptions);
    } catch(error) {
        // ...
    }

    // ...
    
    const ast = {
        type: "postcss",
        version: result.processor.version,
        root: result.root,
    };
    
    // 异步回调函数
    callback(null, result.css.toString(), map, { ast });
};
```
postcss-loader默认使用postcss为传递的css添加特定厂商的前缀。  
`css-loader/src/index.js`：
```javascript 
export default async function loader(content, map, meta) {
    const rawOptions = this.getOptions(schema);
    const plugins = [];
    const callback = this.async();

    // ..

    const importCode = getImportCode(imports, options);
    const moduleCode = getModuleCode(result, api, replacements, options, this);
    const exportCode = getExportCode(
        exports,
        replacements,
        needToUseIcssPlugin,
        options
    );
    
    callback(null, `${importCode}${moduleCode}${exportCode}`);
}
```  
css-loader的主要作用就是处理css文件中的@import和url语句，处理css-modules，并将结果作为一个js模块返回。
