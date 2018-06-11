/**
 * Created by lwz on 2016/12/6.
 * @description requirejs统一的配置文件
 */
requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        'app': '../app',
        'components': '../components',
        'util': '../util',
        'swiper': 'swiper.min',
        'jSignature': 'jSignature.min.noconflict',
        // 兼容PC版 , nc6_zepto 为 1.2版 ;
        'zepto':'nc6_zepto'
    },
    shim: {
        "zepto": {
            exports: "$"
        },
        "iscroll": {
            exports: "isc"
        },
        "jSignature": {
            deps: [ 'jquery' ],
            exports: 'jSignature'
        },
        'swiper': {
            exports: 'swiper'
        }
    }
});