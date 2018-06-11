define(["jquery"],function($){

	var dialog = {
			
			init:function(){
				this.initDialog();
			},initDialog:function(){
				var _this=this;

				var loding=$('<div class="container" id="loding">'+
						'<div class="loader4"></div>'+
					'</div>');
				var dialog1=$('<div class="mask" id="dialog" style="display:none;"><div class="tips">'+
				         '<p id="target_count"></p>'+
				         '<div class="tips_bottom2">'+
				         '<a  class="closeDialog" id="closeDialog">确定</a>'+
				         '</div>'+
				    '</div></div>');
				var confirm=$('<div class="mask" id="confirm" style="display:none;">'+
						'<div class="target">'+
					     //'<div class="target_title"><span>信息窗口</span><a href="#" class="closed"></a></div>'+
					     '<div class="target_count" id="confirm_count"></div>'+
					     '<div class="btns">'+
					     '<a class="Determine" id="successConfirm">确定</a>'+
					     '<a class="Cancel"  id="closeConfirm">取消</a>'+
						 '</div>'+
					'</div>'+
				'</div>');
				
				
				$("body").children().eq(0).before(loding);
				$("body").append(dialog1);
				$("body").append(confirm);
				

			},
			/**
			 * 带有info按钮，点击info按钮后提示框消失
			 * info:按钮文字
			 * time:
			 * callback:点击info按钮后的要执行的函数
			 */
			show:function(info,callback,time){
				var _this=this;
//				if(time == ""){
//					$(".tips_bottom2").show();
//				}else{
//					$(".tips_bottom2").hide();
//				}
				$("#dialog #target_count").text(info);
				$("#dialog").show("3000");				
				
//				if (typeof(time) != "undefined"||time != "") {
//					_this.hide(time);
//				}				

				$("#closeDialog").unbind().on("click",function(){
					$("#dialog").hide();		
					if (typeof(callback)!="undefined") {
						callback();
					}
				});

				
			},
			/**
			 * 隐藏弹出框
			 * time:隐藏动作时间
			 */
			hide:function(time){
				
				if (typeof(time) == undefined) {
					time=300;
				}

				$("#dialog").hide(time);
			},
			/**
			 * 显示一段时间自动消失的提示
			 * info:提示信息
			 * time:延迟多久消失
			 * callback:回调函数
			 */
			log:function(info,callback,time){
				$(".tips_bottom2").hide();
				$("#dialog #target_count").text(info);
				$("#dialog").show();
				
				if (typeof(time) != "undefined") {
					
					setTimeout(function(){
						$("#dialog").hide(time);
						if (typeof(callback) != "undefined") {
							callback();
						}
					},time);
					
				}else{
					setTimeout(function(){
						$("#dialog").hide();
					},2000);
					
					
				}
				
				
				
				//this.hide(time);
			},
			/**
			 * 带有"确定"和"取消"的弹出框
			 * info:提示信息
			 * callback:点击确定按钮后执行的函数
			 */
			confirm:function(info,callback){
				$("#confirm").show();
				$("#confirm_count").text(info);
				
				
				$("#successConfirm").unbind().on("click",function(){
					$("#confirm").hide();	
					if (typeof(callback) != "undefined") {
						callback();
					}
									
				});
				
				$("#closeConfirm").unbind().on("click",function(){
					$("#confirm").hide();
				});
			}
			
		};	
			
	$(document).ready(function() {
		dialog.init();
	});
	




   return dialog;
});