jQuery.noConflict();
/*  @preserve
jQuery pub/sub plugin by Peter Higgins (dante@dojotoolkit.org)
Loosely based on Dojo publish/subscribe API, limited in scope. Rewritten blindly.
Original is (c) Dojo Foundation 2004-2010. Released under either AFL or new BSD, see:
http://dojofoundation.org/license for more information.
*/
(function($) {
	var topics = {};
	$.publish = function(topic, args) {
	    if (topics[topic]) {
	        var currentTopic = topics[topic],
	        args = args || {};
	
	        for (var i = 0, j = currentTopic.length; i < j; i++) {
	            currentTopic[i].call($, args);
	        }
	    }
	};
	$.subscribe = function(topic, callback) {
	    if (!topics[topic]) {
	        topics[topic] = [];
	    }
	    topics[topic].push(callback);
	    return {
	        "topic": topic,
	        "callback": callback
	    };
	};
	$.unsubscribe = function(handle) {
	    var topic = handle.topic;
	    if (topics[topic]) {
	        var currentTopic = topics[topic];
	
	        for (var i = 0, j = currentTopic.length; i < j; i++) {
	            if (currentTopic[i] === handle.callback) {
	                currentTopic.splice(i, 1);
	            }
	        }
	    }
	};
})(jQuery);

(function($){

$(document).ready(function() {
	
	// This is the part where jSignature is initialized.
	var $sigdiv = $("#signature").jSignature({'UndoButton':true});

	//初始化高度
	var _height=$(window).height();
	var _width=$(window).width();
	//footer宽高
	$(".footer").width(_width);
	//画布高度
	var canvasHeight = _height - 75;
	$(".jSignature").attr("height",canvasHeight).css("height", canvasHeight + "px");
	
	//初始化重置画布对象
	$sigdiv.jSignature('reset');
	
	//确定按钮点击
	$("#OAHandWrite_submit").on('click', function(){
		//产生的图片
		var data = $sigdiv.jSignature('getData', "image");
		//保存到缓存
		window.sessionStorage.handWriteData = data[1];
		console.log(data);
		//确定后跳转
		var url = window.location.href ;
		var urlparam =url.split("?")[1];
		window.history.back(-1);
	});
	
	var setDataStr = "";
	if(window.sessionStorage.historyFlag == "y"){
        //撤销键不显示
        $(".revoke").hide();
		$sigdiv.jSignature("disable");
		setDataStr = window.sessionStorage.handWriteDataHistory;
		//确定键不显示
		$(".bottom_submit").html("<li id='OAHandWrite_cancel' style='width:100%;'>返回</li>");
	}else{
		setDataStr = window.sessionStorage.handWriteData;
	}
	
	
	//取消按钮点击
	$("#OAHandWrite_cancel").unbind().on('click', function(){
		var url = window.location.href ;
		var urlparam =url.split("?")[1];
		window.history.back(-1);
	});
	//加上撤销事件监听
	$(".revoke").unbind().on("click",function(){
		$("#undoLastInput").click();
	});
	
	var dataStr = ["image/png;base64", setDataStr];
	$sigdiv.jSignature('setData', "data:" + dataStr);
})

})(jQuery)