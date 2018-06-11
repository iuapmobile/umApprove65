define(["zepto","iscroll","dialog"],function($,isc,dialog){
	var paramUser=JSON.parse(window.sessionStorage.paramUser);
	var param=getURLparams();	//上个页面传过来的参数
	var bodyList;//=JSON.parse(window.sessionStorage.bodyList);
	var bodys=JSON.parse(window.sessionStorage.bodys);
	var _iscroll;
	
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

	var _item={
			/**
			 * 数据长度为0时，提示无数据
			 */	
			show_nodata:function(message){
				var window_height = document.documentElement.clientHeight;
				var _height =window_height-148;
				var _top = _height*0.5;
				var _bottom =_height * 0.5; 
				var no_data = $('<div class="error-none" style=" padding-top:'+ _top +'px;height:100%;  padding-bottom:'+ _bottom +'px;">'
							+ '<table width="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
							+ '<tr><td valign="middle" width="100%"><img class="nodata_img" src="images/no_data.png"/><p>'+ message +'</p></td></tr>'
							+ '</table>'
							+ '</div>');
				$("#dillDetailList section").html("").append(no_data);
				$("#dillDetailList section").css("margin-top","0px");
			},
			init:function(){
				_item.lightAppMultilingual();//多语化	
				if(isWeiXin()){
					_item.weixinHideShare();//微信禁止分享					
				}
				_item.initListHeight();
				_item.initTab();
			},/**
			 * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
			 */
			lightAppMultilingual:function(){
				//首先设置title
			    var $body = $('body');
			    document.title = eval("billDetailSubitemLang." + paramUser.lang + ".pageTitle");
		        // hack在微信等webview中无法修改document.title的情况
		        var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
		        $iframe.on('load',function() {
		            setTimeout(function() {
		                $iframe.off('load').remove();
		            }, 0);
		        }).appendTo($body);
				//然后设置页面显示的汉字
				for(var i in eval("billDetailSubitemLang." + paramUser.lang + ".pageContent")){
				    //i即属性名字ok,close
					console.log("key===" + i + ",value==" + eval("billDetailSubitemLang." + paramUser.lang + ".pageContent." + i));
					$("." + i ).html(eval("billDetailSubitemLang." + paramUser.lang + ".pageContent." + i));
				}
				//再设置页面中的placeholder中的汉字
				for(var i in eval("billDetailSubitemLang." + paramUser.lang + ".pagePlaceHoder")){
				    //i即属性名字ok,close
					console.log("placeholder key===" + i + ",value==" + eval("billDetailSubitemLang." + paramUser.lang + ".pagePlaceHoder." + i));
					$("." + i ).attr("placeholder",eval("billDetailSubitemLang." + paramUser.lang + ".pagePlaceHoder." + i));
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
			 * 计算高度
			 */
			initListHeight:function(){
				var width=$(window).width();
				var height=$(window).height();
				$("body,#dillDetailList").width(width).height(height);
				
				$("#dillDetailList").width(width).height((height-31));
			},
			/**
			 * 加载多tab
			 */
			initTab:function(){
				for(var i=0;i<bodys.length;i++){
   					if(i==param.lineIndex){
   						$("#nav").append($('<li><a href="javascript:void(0);" class="line">'+bodys[i].tabName+'</a></li>'));
   					}else{
   						$("#nav").append($('<li><a href="javascript:void(0);">'+bodys[i].tabName+'</a></li>'));
   					}
   				}
 				//计算滑动总距离
				var navTab=$("#navTab ul li");
				var _ulWidth=0;
				for(var i=0;i<navTab.length;i++){
					var _w=$("#navTab ul li").eq(i).width();
					_ulWidth+=(_w);
				}
				$("#navTab").width($(window).width()).find("ul").width(_ulWidth+15);
				var startStatus=false,endStatus=true;
				//生成多页签滑动效果
				var myScroll = new iScroll('navTab',{
					vScroll:false,
					hScrollbar:false,
					vScrollbar:false,
					onScrollEnd:function(){
						//判断前，后滚动状态
						if(this.x==0){
							startStatus=false;
						}else if(this.x==this.maxScrollX){
							endStatus=false;
						}else{
							startStatus=true;
							endStatus=true;
						}
					}
				});
				//点击页签滚动效果
				$("#nav li").on("click",function(e){
					var _this=$(this);
					$("#nav a").removeClass("line");
					_this.find("a").addClass("line");
					var _widht=$(window).width()/2;
					//点击左侧
					if(e.pageX<_widht){
						if(startStatus){
							myScroll.scrollTo(-100,0,500,50);
						}
					//点击右侧
					}else{
						if(endStatus){
							myScroll.scrollTo(100,0,500,50);
						}
					}
					var _index=_this.index();
					bodyList=bodys[_index].tabContent;
					_item.initDetailList(bodys[_index]);
				});
				bodyList=bodys[param.lineIndex].tabContent;
				_item.initDetailList(bodys[param.lineIndex]);
			},
			/**
			 * 任务详情接口
			 */
			initDetailList:function(){
				$("#dillDetailList section").html("");
				if(typeof(bodyList)=="undefined"){
					_item.show_nodata("单据详情为空");
					_item.bindEvent();
					return;
				}
	   			for(var i=0;i<bodyList.length;i++){
	   				var itemData=bodyList[i].billItemData;
	   				var _detailsDiv=$('<div class="details_new" id="top'+(i+1)+'">');
	   				var _detailsTop=$('<div class="triangle_topleft"><span class="triangle_topleft_number">'+(i+1)+'</span></div>');
	   				var _detailsUl=$('<ul class="details_new_ul"></ul>');	
		   			for(var j=0;j<itemData.length;j++){
		   				if(itemData[j].digest == false){
		   					var item,showName;
			    			for(var key in itemData[j]){
	   		    				if(key.split("itemShowName").length==2){
	   		    					item=key.split("itemShowName")[0];
	   		    					showName=key.split("itemShowName")[0]+"itemShowName";
	   		    					break;
	   		    				}
	   		    			} 
		    				var itemName=eval('itemData[j]["'+showName+ '"]');
		    				var itemValue=typeof(eval('itemData[j]["'+item + '"]'))=="undefined"?"":eval('itemData[j]["'+item + '"]');
		    				
		    				//console.log("itemName == " + itemName + "item== " + item + ",typeof(eval('itemData[j].'+item))====" + typeof(eval('itemData[j].'+item)));
		    				//根据值的类型再次进行分解
		    				var itemValueType = typeof(eval('itemData[j]["'+item + '"]'));
		    				var itemValue="";//typeof(eval('itemData[j].'+item))=="undefined"?"":eval('itemData[j].'+item);
		    				//如果值类型为对象，则处理如果后再进行赋值
		    				if(itemValueType == "object"){
		    					//对象时候，要区分是日期还是金额
		    					//日期
		    					var dataYearFlag = typeof(eval('itemData[j]["'+item + '"]["year"]'));
		    					if(dataYearFlag != "undefined"){
		    						var millis=eval('itemData[j]["'+item + '"]["millis"]');
		    						var newTime = new Date(millis); //就得到普通的时间了 
		    						var year=newTime.getFullYear();
		    						var month=(newTime.getMonth()+1).toString().length==1?("0"+parseInt(newTime.getMonth()+1)):(newTime.getMonth()+1);
		    						var day=newTime.getDate().toString().length==1?("0"+newTime.getDate()):newTime.getDate();
		    						var hours=newTime.getHours().toString().length==1?("0"+newTime.getHours()):newTime.getHours();
		    						var minutes=newTime.getMinutes().toString().length==1?("0"+newTime.getMinutes()):newTime.getMinutes();
		    						var seconds=newTime.getSeconds().toString().length==1?("0"+newTime.getSeconds()):newTime.getSeconds();
		    						itemValue=year+"-"+month+"-"+day+" "+hours+":"+minutes+":"+seconds; 
		    						//itemValue = eval('headList[i].'+item + ".year") + "-" + eval('headList[i].'+item + ".month") + "-" + eval('headList[i].'+item + ".day");
		    					}
	    						//金额
		    					var moneyDoubleFalg = typeof(eval('itemData[j]["'+item + '"]["double"]'));
    							if(moneyDoubleFalg != "undefined"){
    								itemValue = eval('itemData[j]["'+item + '"]["double"]').toFixed(Math.abs(eval('itemData[j]["'+item + '"]["power"]')));
		    					}
    							//text的对象
    							var textFalg = typeof(eval('itemData[j]["'+item + '"]["text"]'));
    							if(textFalg != "undefined"){
    								itemValue = eval('itemData[j]["'+item + '"]["text"]');
		    					}
    							
		    				}else{
		    					//否则直接赋值
		    					itemValue= itemValueType=="undefined" ? "":eval('itemData[j]["'+item + '"]');
		    				}
		    				var detailsLi=$('<li>'+itemName+'：<span>'+itemValue+'</span></li>');
		    				_detailsUl.append(detailsLi);
		   				}			
		    				
		    		 }
		   			_detailsDiv.append(_detailsTop).append(_detailsUl);
		   			
		   			$("#dillDetailList section").append(_detailsDiv);
		   			if(i==(bodyList.length-1)){
		   				$("#dillDetailList section").append($('<div style="width:100%;height:30px;"></div>'));
		   				_item.bindEvent();
		   			}
		   			
	   			}
	   		
	   			
				
			},
			/**
			 * 单据列表加载
			 */
			bindEvent:function(){
				if(typeof(_iscroll)!="undefined"){
					_iscroll.destroy();
				}
				_iscroll=new iScroll('dillDetailList', {
					scrollbarClass: 'myScrollbar',
					hScroll:true,
					vScroll:true,
	   			    zoom: true,
	   		        scrollX: true,
	   		        scrollY: true,
	   		        mouseWheel: true,
	   		        wheelAction: 'zoom',
	   		        zoomMax:4
				});

				_iscroll.scrollToElement("#top"+param.index,0);
				
				
				
			}
			
			
	};
	
	
	
	return _item;
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
function goTop(acceleration, time) {
	acceleration = acceleration || 0.1;
	time = time || 16;
	var x1 = 0;
	var y1 = 0;
	var x2 = 0;
	var y2 = 0;
	var x3 = 0;
	var y3 = 0;
	if (document.documentElement) {
		x1 = document.documentElement.scrollLeft || 0;
		y1 = document.documentElement.scrollTop || 0;
	}
	if (document.body) {
		x2 = document.body.scrollLeft || 0;
		y2 = document.body.scrollTop || 0;
	}
	var x3 = window.scrollX || 0;
	var y3 = window.scrollY || 0;
	// 滚动条到页面顶部的水平距离
	var x = Math.max(x1, Math.max(x2, x3));
	// 滚动条到页面顶部的垂直距离
	var y = Math.max(y1, Math.max(y2, y3));
	// 滚动距离 = 目前距离 / 速度, 因为距离原来越小, 速度是大于 1 的数, 所以滚动距离会越来越小
	var speed = 1 + acceleration;
	window.scrollTo(Math.floor(x / speed), Math.floor(y / speed));
	// 如果距离不为零, 继续调用迭代本函数
	if (x > 0 || y > 0) {
		var invokeFunction = "goTop(" + acceleration + ", " + time + ")";
		window.setTimeout(invokeFunction, time);
	}
}
