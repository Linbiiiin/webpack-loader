const pluginName = 'MyTestPlugin';

function MyTestPlugin() {}

MyTestPlugin.prototype.apply = function(compiler) {
    console.log('this', compiler);
    // 代表开始读取 records 之前执行
    compiler.hooks.run.tap(pluginName, (compilation) => {
        console.log("webpack 构建过程开始！");
        // console.log('compilation', compilation);
    });
};

module.exports = MyTestPlugin;