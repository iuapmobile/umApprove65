define(["zepto", "dialog"],function($, dialog){
	function LoginForm(username, password, errorTips) {
		if(this instanceof LoginForm) {
			this.username = username;
			this.password = password;
			this.errorTips = errorTips;
		} else {
			return new LoginForm(username, password, errorTips);
		}
	}

	LoginForm.prototype.init = function() {
		var loginFormStr = '\
			<div class="mask" id="loginForm" style="display:none;">\n\
				<div class="loginBox">\n\
				<label class="errorTips">登录信息已过期，请重新登录！</label>\n\
				<form>\n\
					<div class="submit_count">\n\
						<section class="inner_content">\n\
						<li class="li_user"><input type="text" class="username_text"  placeholder="用户名" id="username"/></li>\n\
						<li class="li_user"><input type="password" class="password_text" placeholder="密码" id="userpass"/></li>\n\
						</section>\n\
					</div>\n\
					<button type="button" class="submit_btn loginLabel" id="login">登 录</button>\n\
				</form>\n\
				</div>\n\
			</div>';
		$('body').append($(loginFormStr));
	};
	LoginForm.prototype.show = function(contextPath, maurl, headStr, failureCb, successCb) {
		$('#loginForm').show();
		$('.loginBox .errorTips').html("登录信息已过期，请重新登录！");
		var that = this;
		$("#username,#userpass").unbind().on("keydown", function (event) {
			if (event.keyCode == 13) {
				$(this).blur();
				//调用登录接口
				that.login(contextPath, maurl, headStr, failureCb, successCb);
			}
		});

		$("#login").unbind().on("click", function () {
			//调用登录接口
			that.login(contextPath, maurl, headStr, failureCb, successCb);
		});
	};
	LoginForm.prototype.hide = function() {
		$('#loginForm').hide();
	};
	LoginForm.prototype.login = function(contextPath, maurl, headStr, failureCb, successCb) {
		var username = $("#username").val().trim();
		var password = $("#userpass").val().trim();
		if(!username || !password) {
			$('.loginBox .errorTips').html("用户名和密码不能为空!");
			return false;
		}
		//此时调用后台登录，并绑定微信号
		var params = {
			action: "logintoother",
			param: {
				ucode: username,
				upwd: password,
				logintype: "NC"
			}
		},
			urlparam = window.sessionStorage.getItem('urlparam'),
			url = urlparam ? (contextPath + "/wechat/login?" + urlparam + "&t=" + new Date().getTime()) : (contextPath + "/wechat/login?t=" + new Date().getTime());
		$('#loding').show();
		$.ajax({
			type: "POST",
			async:false,
			url: url,
			dataType: "json",
			contentType: "application/json",
			data: JSON.stringify(params),
			beforeSend: function (XMLHttpRequest) {
				XMLHttpRequest.setRequestHeader("maurl", maurl);
				XMLHttpRequest.setRequestHeader("head", headStr);
			},
			success: function (result) {
				$('#loding').hide();
				if(result.code != '0') {
					if(typeof failureCb === 'function') {
						var desc = result.desc || "登录失败!";
						$('.loginBox .errorTips').html(desc);
						failureCb(desc);
					}
					return;
				}
				if(typeof successCb === 'function') {
					successCb(result);
				}
			},
			error: function (XMLHttpRequest, textStatus, errorThrown) {
				$('#loding').hide();
				if(typeof failureCb === 'function') {
					$('.loginBox .errorTips').html("请求失败，请检查网络连接后重试!");
					failureCb("请求失败，请检查网络连接后重试");
				}
			}
		});
	};
			
	$(document).ready(function() {
		new LoginForm().init();
	});

   return new LoginForm();
});