define([], function(){

	window.uapmobile = {
		init:function(){
	        window.__$_CORDOVA_PATH = window.location.origin+"/ncapprove/js/lib/uapmobile/" ;
	        window.isSummer = true ;			
		}
	};

	require(['js/lib/uapmobile/js/summer.js?v=11'],function(){

		uapmobile.goIm=function( usercode ,taskid,appkey,domain,userid , isOA , imTitle){
			var url = 'https://cloud.yonyou.com/ncapprove/detail.html?statuskey=ishandled&statuscode=unhandled&'+
					  'taskid='+taskid+'&appkey='+appkey+'&domain='+domain+'&userid='+userid ;
			if( isOA ){
				url += '&actiontype=oapush';
			}

			var command = {
	            "method" : "YYIM.chat",
	            "params" : {
	                "chatID" : usercode,
					"sendMessage":[{
						"sendType":"text",
						"content":url,
						"title":imTitle
					}]
	            }
	        }
	        cordova.exec(null, null, "XService", "callSync", [command]);
		}
	})

	return uapmobile ;
})

