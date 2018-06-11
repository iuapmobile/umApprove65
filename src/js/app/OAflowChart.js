define(["zepto","iscroll","dialog"],function($,isc,dialog){
	var paramUser=JSON.parse(window.sessionStorage.paramUser);
	var paramData=getURLparams();

	console.log(paramUser,paramData)

    // 双良--移动审批迁移到PC端口 需要动态改变字体大小颜色 ;
    if( /Android|webOS|iPhone|iPod|BlackBerry|micromessenger/i.test(navigator.userAgent) ) {
    } else {
        try{
            $("body").append('<div class="shuangliangGoBackButton">后退</div>');
            $("body").on("click",".shuangliangGoBackButton",function(){
                history.go(-1)
            })
        }catch(error){}
    }
    
	$("#loding").show();
	var _iscroll;
	var _img;
	var _img_next;
	var _chart={
		/**
		 * 报错时提示
		 */
		show_error:function(message){
			var window_height = document.documentElement.clientHeight;
			var _top = (window_height)*0.33;
			var error_data = $('<div class="error-none" style="padding-top:'+ _top +'px;">'
						+ '<table width="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
						+ '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>'+ message +'</p></td></tr>'
						+ '</table>'
						+ '</div>');
			$("#pictrue").html("").append(error_data);
			//$(".batch_mode").css("display","none");
		},	
		
		/**
		 *初始化
		 */
		init:function(){
			_chart.lightAppMultilingual();
			if(isWeiXin()){
				_chart.weixinHideShare();//微信禁止分享				
			}
			_chart.initHeightStyle();
			_chart.initTaskFlowChart();
//			_chart.initBindEvent();			
		},
		/**
		 * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
		 */
		lightAppMultilingual:function(){			
			//首先设置title
		    var $body = $('body');
		    document.title = eval("OAflowCharLang." + paramUser.lang + ".pageTitle");
	        // hack在微信等webview中无法修改document.title的情况
	        var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
	        $iframe.on('load',function() {
	            setTimeout(function() {
	                $iframe.off('load').remove();
	            }, 0);
	        }).appendTo($body);
			//然后设置页面显示的汉字
			for(var i in eval("OAflowCharLang." + paramUser.lang + ".pageContent")){
			    //i即属性名字ok,close
				console.log("key===" + i + ",value==" + eval("OAflowCharLang." + paramUser.lang + ".pageContent." + i));
				$("." + i ).html(eval("OAflowCharLang." + paramUser.lang + ".pageContent." + i));
			}
			//再设置页面中的placeholder中的汉字
			for(var i in eval("OAflowCharLang." + paramUser.lang + ".pagePlaceHoder")){
			    //i即属性名字ok,close
				console.log("placeholder key===" + i + ",value==" + eval("OAflowCharLang." + paramUser.lang + ".pagePlaceHoder." + i));
				$("." + i ).attr("placeholder",eval("OAflowCharLang." + paramUser.lang + ".pagePlaceHoder." + i));
			}
		},
		//微信禁止分享
		weixinHideShare:function(){
			function onBridgeReady(){
			 	WeixinJSBridge.call('hideOptionMenu');
			}
			
			if (typeof WeixinJSBridge == "undefined"){
			    if( document.addEventListener ){
			        document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
			    }else if (document.attachEvent){
			        document.attachEvent('WeixinJSBridgeReady', onBridgeReady); 
			        document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
			    }
			}else{
			    onBridgeReady();
			}
		},
		/**
		 *加载样式
		 */
		initHeightStyle:function(){
			var _width=$(window).width();
			var _height=$(window).height();
			$("body").width(_width).height(_height);
		},
		/**
		 *加载数据
		 */
		initTaskFlowChart:function(){
			var param={
				serviceid:"oa_sp63_ispservice",
		   		token:paramUser.oatoken,
		   		usercode:paramUser.ucode,
		   		getTaskFlowChart:{
		   			groupid:paramUser.groupid,
		   			userid:paramUser.userid,
		   			taskid:paramData.taskid,
		   			//statuscode:paramData.statuscode,
		   			//statuskey:paramData.statuskey,
		   			//picid:"",
		   			//width:"100",
		   			//height:"100"
			    }
   			  };

			var url=contextPath()+"/umapp/reqdata?radom=" + Math.random();

			 $.ajax({
				    type:"post",
				    url : url,
				    //async : true,
				    data:JSON.stringify(param),
				    beforeSend: function(XMLHttpRequest) {
				           XMLHttpRequest.setRequestHeader("maurl",paramUser.maurl);
				    },
				    contentType:'application/json;charset=utf-8',
				    success: function(result){
				    	result = eval('(' + result + ')'); 

				    	console.log(result) 
				    	if(result==""||typeof(result)=="undefined"){
				    		console.log("流程图加载失败");
				    		//dialog.log(eval("OAflowCharLang." + paramUser.lang + ".pageMessage.flowCharfailedLoad"));//"流程图加载失败"
				    		_chart.show_error(eval("OAflowCharLang." + paramUser.lang + ".pageMessage.flowCharfailedLoad"));//"流程图加载失败"
				    		$("#loding").hide();
				    	}else{
				    		
				    		if(result.code!="0"){
				    			console.log(result.desc);
					    		//dialog.log(result.desc);
					    		_chart.show_error(eval("OAflowCharLang." + paramUser.lang + ".pageMessage.flowCharfailedLoad"));//"流程图加载失败"
					    		$("#loding").hide();
				    		}else{
				    			var jsonData = result.jsonDatas.getTaskFlowChart[0];
				    			if((!jsonData)||jsonData.flag == '1'){
				    				if(jsonData.desc == undefined){
				    					_chart.show_error(eval("OAflowCharLang." + paramUser.lang + ".pageMessage.flowCharfailedLoad"));//"流程图加载失败"
				    				}else{
				    					_chart.show_error(jsonData.desc);
				    				}
				    				$("#loding").hide();
				    			}else{

				    				// really ;

				    				_img=result.jsonDatas.getTaskFlowChart[0].pic;
									if(Object.prototype.toString.call(_img) === '[object Array]') {
										_img = btoa(String.fromCharCode.apply(null, new Uint8Array(_img))); // 转换为Base64
									}
									var _picture=$('<div id="charFlow_picture"><img src=data:image/png;base64,'+ _img+' id="imgload" style="display:block;" style="width:300%"  /></div>');
									$("#pictrue").append(_picture);

									// 处理子流程
				    				var nextpiclist = result.jsonDatas.getTaskFlowChart[0].nextpiclist;
				    				if(nextpiclist != undefined && nextpiclist.length){
				    					//_img_next = nextpiclist[0].pic;
										$("#pic_next").show();
										$("#pic_next").on('click', function() {
											$('#loding').show();
											$("#pic_next").hide();
											$("#pictrue").hide();
											var _picture_next = $('<div id="charFlow_picture_next"></div>');
											nextpiclist.forEach(function (item) {
												var itemPic = item.pic;
												if(Object.prototype.toString.call(itemPic) === '[object Array]') {
													itemPic = btoa(String.fromCharCode.apply(null, new Uint8Array(itemPic))); // 转换为Base64
												}
												$('<img src=data:image/png;base64,'+ itemPic + ' style="display:block;margin-bottom:20px;" />').appendTo(_picture_next)
											});
											$("#pictrue_next").show();
											$("#pictrue_next").append(_picture_next);
											var timer = setTimeout(function() {
												var window_height = $(document).height();//浏览器当前文档的高度
												var img_height = $('#charFlow_picture_next').height();
												var padValue = (window_height - img_height)/2;
												//alert(window_height  + '  ' + img_height  + '  ' + padValue);
												//iscroll缩放滑动
												$('#charFlow_picture_next').css('padding-top', padValue +'px').css('padding-bottom', padValue +'px');
												if(padValue < 30){
													$('#charFlow_picture_next').css('padding-bottom', '30px');
												}
												if(typeof(_iscroll)!="undefined"){
													_iscroll.destroy();
												}
												_iscroll=new iScroll('pictrue_next', {
													scrollbarClass: 'myScrollbar',
													checkDOMChanges:true,
													zoom: true,
													scrollX: true,
													scrollY: true,
													mouseWheel: true,
													wheelAction: 'zoom',
													zoomMax:4
												});
												clearTimeout(timer);
												$('#loding').hide();
											}, 100);
										});
				    				}
						   	        
						   	        /*var window_height = $(document).height();//浏览器当前文档的高度
						   	        if(window_height < 600){//ipone 4/5
						   	        	$('#charFlow_picture').css('padding-top', '30%').css('padding-bottom', '10%');
						   	        }else if(window_height < 700){
						   	        	$('#charFlow_picture').css('padding-top', '40%').css('padding-bottom', '10%');
						   	        }else{
						   	        	$('#charFlow_picture').css('padding-top', '50%').css('padding-bottom', '10%');
						   	        }*/

							   	    /*imgload.onload = function(){
							   	        // 加载完成  
							   	    	var window_height = $(document).height();//浏览器当前文档的高度
							   	        var img_height = $('#charFlow_picture').height();
							   	        var padValue = (window_height - img_height)/2;
							   	        alert(window_height  + '  ' + img_height  + '  ' + padValue);
							   	        
							   	        $('#charFlow_picture').css('padding-top', padValue +'px').css('padding-bottom', padValue +'px');
							   	        if(padValue < 30){
							   	        	$('#charFlow_picture').css('padding-bottom', '30px');
							   	        }
							   	    };*/
								   	
						   	        
					   	            document.getElementById("imgload").onload=function(){
					   	            	//图片加载完成，居中
					   	            	var window_height = $(document).height();//浏览器当前文档的高度
							   	        var img_height = $('#charFlow_picture').height();
							   	        var padValue = (window_height - img_height)/2;
							   	        //alert(window_height  + '  ' + img_height  + '  ' + padValue);
							   	        //iscroll缩放滑动
							   	        $('#charFlow_picture').css('padding-top', padValue +'px').css('padding-bottom', padValue +'px');
							   	        if(padValue < 30){
							   	        	$('#charFlow_picture').css('padding-bottom', '30px');
							   	        }
					   	            	
					   	            	if(typeof(_iscroll)!="undefined"){
						   					_iscroll.destroy();
						   				}
						   				_iscroll=new iScroll('pictrue', {
						   					scrollbarClass: 'myScrollbar',
						   					checkDOMChanges:true,
							   			    zoom: true,
							   		        scrollX: true,
							   		        scrollY: true,
							   		        mouseWheel: true,
							   		        wheelAction: 'zoom',
							   		        zoomMax:4
						   					});		   
					   	            };
					   	            $("#loding").hide();
				    			} //really ;;



				    			
				    		}
				    	}
				    },
				     error : function(XMLHttpRequest, textStatus, errorThrown) {
				     _chart.show_error(eval("OAflowCharLang." + paramUser.lang + ".pageMessage.Error"));//"调用接口失败"
				     //加载样式处理
				     $("#loding").hide();
				    }
				 });		
			
		},

		/**
		 *事件绑定
		 */
		initBindEvent:function(){
		
		}
		
	}
	
	
	return _chart;

});

/**
 * 解析URL攜帶的?之後的參數，轉換為對象，返回之
 * @param location
 * @returns
 */
var getURLparams = function(){
        var o = {};
        if(location.search){
                var search_params = location.search.substr(1).split('&');
                if(search_params){
                        $.each(search_params, function(i){
                                o[this.split('=')[0]] = decodeURIComponent(this.split('=')[1]);
                        });
                }
        }
        return o;
};
//判断为微信浏览器
function isWeiXin(){ 
	var ua = window.navigator.userAgent.toLowerCase(); 
	if(ua.match(/MicroMessenger/i) == 'micromessenger'){ 
		return true; 
	}else{ 
		return false; 
	} 
};
/**
 * 获取URL的contextPath
 * @param
 * @returns
 */
var contextPath = function(){
    var origin = window.location.protocol + '//' + window.location.host;
    var pathname = location.pathname;
	//var projectname = pathname.substr(0, pathname.indexOf('/', 1));
	var projectname = pathname.substr(0, pathname.indexOf('/', 0));
    return origin + projectname;
};

