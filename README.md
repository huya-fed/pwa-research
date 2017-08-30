# Progressive Web App - 渐进式web应用

## 基于国内环境能实现的功能   
1.缓存各种资源文件，包括接口请求,让web应用看起来像是跑在本地一样,2G、3G或者弱网环境下特别明显;   
2.可以让应用在离线环境使用;   
3.让 web 应用能够像原生应用一样被添加到主屏、全屏执行的 Web App Manifest.   

## [线上demo](https://hd.huya.com/pwa-test7/index.html?t=1)

## 使用步骤
### 在html中加上如下脚本，用于检测service worker是否支持，如果支持即注册service worker
> 注:由于被注册的service worker文件不能被缓存，否则无法更新，但是hd.huya.com对发布的文件默认有24小时缓存，所以跟后台约定了命名为sw.js或者service-worker.js的文件Cache-Control为no-cache.(即只能使用这两种命名)

```
<script type="text/javascript">
	if('serviceWorker' in navigator) {
		window.addEventListener('DOMContentLoaded', function() {
			navigator.serviceWorker.register('./sw.js', { 
				scope: './'
			}).then(function(registration) {
				console.log('ServiceWorker registration successful with scope: ', registration.scope);
			}).catch(function(err) {
				console.log('ServiceWorker registration err: ', err);
			});
		});
	} else {
		console.log('service worker is not supported');
	}
</script>
```
>注: sw.js或者service-worker.js建议放在项目根目录下，因为这个注册好后不能被改变名称和位置的。而且只能缓存该文件所在根目录下的其他文件.

### 引入sw.js到你项目的根目录下
可以看到该文件上面有如下代码，并有相关注释，你只需要根据项目请求更改这部分，其他的sw主逻辑不需要更改:

```
/**
* 每次有任何文件更新，都需要更改缓存的版本号,才能使得更新生效
*/
var CACHE_VERSION_NAME = 'test-v' + 1;
/**
* 需要缓存的文件。注:
* 1: 对于同步输出的html，不应该缓存   
* 2: 如果更新的文件是html，也需要加上时间戳或者版本号,如"./index.html?v=1",并且访问的时候也是如此   
* 3: 更新过的文件需要使用md5格式名称或者在文件名后加上时间戳(和引用方式同步,如<link rel="stylesheet" href="css/index.css?t=1">,  则这里配置的名称为"css/index.css?t=1")
*/
var filesToBeCached = [

];

/**
* (该功能可选)
* 配置通过ajax访问的url，用于缓存接口的数据，这样接口也不用每次去线上请求，注:   
* 1: 只适用于cache:true的接口，并且需要定义好jsonp和jsonpCallback名称的请求，即不能是动态的接口   
* 2: 这里设置了接口缓存的有效期为2分钟，即2分钟后会拉取线上的数据，并且更新到本地   
*/
var ajaxUrls = [];

```

### 使用了sw的项目需要发布到https下才能正式使用

### 为了让你的应用能够像原生应用一样被添加到主屏、全屏执行，你需要添加manifest.json配置文件

```
<link rel="manifest" href="manifest.json">
```

具体manifest的配置可参看第三方文档 [manifest配置](http://open.chrome.360.cn/html/dev_manifest.html)