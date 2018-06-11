define(["zepto", "iscroll", "dialog"], function ($, isc, dialog) {

    //配置参数
    var paramUser, clientParam, searchParam;
    //全局变量
    var _iscroll, loadStatus, querytype, spStatus, billStatus;

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
    
    //全局变量---动态获取数据
    //---按钮数组
    var pagesCode = [];//页脚页标识
    var pagesName = [];//页脚页签名
    var buttonsCode = [];//页头按钮标识 paramData.buttonsCode
    var buttonsName = [];//页头按钮
    var pageIndex = 0;//当前点击的是第几页，从0开始
    var pageHeaderBtn = [];//pageHeaderBtn[pageIndex] = headerBtnIndex
    var headerBtnIndex = 0;//当前页头点击的是第几个按钮，从0开始
    //---单据列表数组
    var NC_billsArray = [];//NC单据数组
    var OA_billsArray = [];//OA单据数组
    var billsArray = [];//单据数组
    var count = 25;//每次加载单据数目
    var currentCountId = 0;//每条的id编号
    var noBill = false;
    var pageFirstIn = [];
    var OA_NC_getBillList_flag = 0;//当数据来源NC+OA时，2表示调用OA和NC完成

    var releaseKey = false;//标记拉动是否释放，默认false,释放true,只有释放后才能更新页面数据
    var downLoadKey = false;//下拉加载数据可用true,禁用false
    var upLoadKey = false;//上拉加载数据可用true,禁用false
    var mark_i = 0;//标识是否第一次开始下拉，第一次不用转动箭头\

    //屏幕高度
    window_height = $(window).height();

    //判断浏览器类型
    var u = navigator.userAgent, app = navigator.appVersion;
    var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1; //android终端或者uc浏览器
    var isiOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    var client = isWeiXin() ? "wechat" : (isiOS ? "ios" : (isAndroid ? "android" : "other"));
    setCookie("test", "get_lang()");
    //alert("cookie测试用===" + getCookie("mobileMac"));
    paramUser = JSON.parse(window.sessionStorage.paramUser);
    //上个页面传过来的参数
    var paramData = getURLparams();
    //微信标识
    var isWeiXinFlag = isWeiXin();

    var _billSearch = {

        login: function () {
            //加载中图标
            //$("#loding").show();
            //初始化多语言
            _billSearch.lightAppMultilingual();
            //加载中图标
            $('iframe').css('display', 'none');
            //从前页面传递过来的参数
            _billSearch.GoTaskList();
        },
        //打开任务列表
        GoTaskList: function () {
            $("#indexPage").show();
            //事件绑定
            _billSearch.billInputClick();//输入框回车键相应
            var search_result_on_input = $("#search_result_on_input").val().trim();
            if (search_result_on_input != "") {
                //调用登录接口
                _billSearch.getBillList(paramData.pagesCode, paramData.buttonsCode, 1);
            }
        },

        /**
         *初始化
         */
        init: function () {
            //初始化页面参数
            _billSearch.initStyle();
            _billSearch.bindEvent();
        },

        /**
         *加载样式
         */
        initStyle: function () {
            var _height = $(window).height();
            $("#nc_list").height(_height - 90);
        },
        /**
         * 绑定页面事件
         */
        bindEvent: function () {
            _billSearch.billClickEvent();//点击单据时绑定事件
        },
        /**
         * 回车键的相应
         */
        billInputClick: function () {
            $(".search_result_on_input").unbind().on("keydown", function (event) {
                if (event.keyCode == 13) {
                    //关键字为空的时候，进行信息提示
                    var search_result_on_input = $("#search_result_on_input").val().trim();
                    if (search_result_on_input != "") {
                        //加载转圈
                        $("#loding").show();
                        $(this).blur();
                        //调用登录接口
                        _billSearch.getBillList(paramData.pagesCode, paramData.buttonsCode, 1);
                    } else {
                        _billSearch.show_error("请输入关键字进行搜索");
                        $(this).focus();
                    }
                    event.preventDefault();
                    return false;
                }
            });
        },

        /**
         * 点击单据时绑定事件
         * 跳转到单据详情页，将taskid传到单据详情页
         */
        billClickEvent: function () {
            $('#scroller').on('click', '.nc_name', function () {
                var taskid = $(this).attr('data-taskid');
                var dataSystem = $(this).attr('data-system');//单据来源系统，"NC"/"OA"
                //点击记录一下当前页面和头部标识
                window.sessionStorage.pageClickedCode = paramData.pagesCode + "," + paramData.buttonsCode;

                if (dataSystem == "NC") {//NC表单，跳到NC表单详情
                    window.location.href = 'billDetail.html?statuskey=' + paramData.pagesCode + '&statuscode=' + paramData.buttonsCode + '&taskid=' + taskid;
                } else {//OA表单，跳到OA表单详情
                    window.location.href = 'OAbillDetail.html?statuskey=' + paramData.pagesCode + '&statuscode=' + paramData.buttonsCode + '&taskid=' + taskid;
                }
            });
        },

        /**
         * 调用获取页头按钮函数
         */
        getBillList: function (_pagesCode, _buttonsCode, startline) {
            var param;
            //标识清零
            OA_NC_getBillList_flag = 0;

            noBill = false;//返回单据数目为0
            var now = new Date();

            //清空单据列表数组
            if (billsArray) {
                billsArray.splice(0, billsArray.length);
            }

            var NC_startline = 1;
            var OA_startline = 1;
            //下拉加载更多时
            //alert("getBillList")
            if (!startline) {
                var NC_currentBillSum = $('#showSearchList').find('.bill[data-system="NC"]').length;//获取页面当前NC单据数目
                var OA_currentBillSum = $('#showSearchList').find('.bill[data-system="OA"]').length;//获取页面当前OA单据数目
                console.log("NC_currentBillSum = " + NC_currentBillSum + "; OA_currentBillSum = " + OA_currentBillSum);

                NC_startline = NC_currentBillSum + 1;
                OA_startline = OA_currentBillSum + 1;

            }
            //适配NC，获取NC数据列表
            if (paramUser.dataSourceSystem.indexOf("NC") != -1) {
                param = {
                    groupid: paramUser.groupid,//'0001A210000000001JRL'
                    usrid: paramUser.userid,//paramUser.userid  //1002A210000000001XLB
                    date: now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate(),//"2016-03-02"
                    statuskey: _pagesCode,//"ishandled"
                    statuscode: _buttonsCode,//"unhandled"
                    startline: NC_startline,//从1开始
                    keyword: $("#search_result_on_input").val().trim() || "",
                    condition: $("#search_result_on_input").val().trim() || "",
                    count: count//每次获取25条
                };
                //适配NC65
                if (paramUser.ncversion == "NC65") {
                    _billSearch.getDataByAjax('getTaskList65', param, 'get_NC_TaskListSuccessFunction', true);
                } else {
                    _billSearch.getDataByAjax('getTaskList', param, 'get_NC_TaskListSuccessFunction', true);
                }
            }
            //适配OA，获取NC数据列表
            if (paramUser.dataSourceSystem.indexOf("OA") != -1) {//OA的情况
                //alert("OA列表")
                param = {
                    groupid: paramUser.groupid,//'0001A210000000001JRL'
                    userid: paramUser.userid,//paramUser.userid  //1002A210000000001XLB
                    date: now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate(),//"2016-03-02"
                    statuskey: _pagesCode,//"ishandled"
                    statuscode: _buttonsCode,//"unhandled"
                    keyword: $("#search_result_on_input").val().trim() || "",
                    condition: $("#search_result_on_input").val().trim() || "",
                    startline: OA_startline,//从1开始
                    count: count//每次获取25条
                };
                //适配NC65
                if (paramUser.ncversion == "NC65") {
                    _billSearch.get_OA_DataByAjax('getTaskList65', param, 'get_OA_TaskListSuccessFunction', true);
                } else {
                    _billSearch.get_OA_DataByAjax('getTaskList', param, 'get_OA_TaskListSuccessFunction', true);
                }
            }
        },
        /**
         * 调用getTaskStatusList接口成功的回调函数
         * 参数：result---get_NC_TaskListSuccessFunction  NC接口返回数据
         * 功能：将接口返回的页脚按钮存入全局数组pagesCode，pagesName
         */
        get_NC_TaskListSuccessFunction: function (result) {
            //OA+NC标志，2表示两个类型列表接口都调用完
            OA_NC_getBillList_flag += 1;
            if (result.code == "0") {
                //清空NC单据列表数组
                if (NC_billsArray) {
                    NC_billsArray.splice(0, NC_billsArray.length);
                }
                var array = result.jsonDatas.getTaskList || result.jsonDatas.getTaskList65;
                //将获取到单据列表赋给NC单据数组
                NC_billsArray = array[0].taskstructlist || [];
                billsArray = billsArray.concat(NC_billsArray);
                //billsArray = result.jsonDatas.getTaskList65[0].taskstructlist;
                //渲染数据调用函数提取
                _billSearch.initDataCalledFun();
            } else {
                //NC+OA除外都打出错误日志
                if (paramUser.dataSourceSystem != 'NC+OA') {
                    $("#loding").hide();
                    _billSearch.show_error(result.desc);
                    return false;
                }
            }
        },

        /**
         * 调用接口成功的回调函数
         * 参数：result---get_OA_TaskListSuccessFunction  OA接口返回数据
         * 功能：将接口返回的页脚按钮存入全局数组pagesCode，pagesName
         */
        get_OA_TaskListSuccessFunction: function (result) {
            //OA+NC标志，2表示两个类型列表接口都调用完
            OA_NC_getBillList_flag += 1;
            if (result.code == "0") {
                //清空OA单据列表数组
                if (OA_billsArray) {
                    OA_billsArray.splice(0, OA_billsArray.length);
                }
                var array =  result.jsonDatas.getTaskList65 || result.jsonDatas.getTaskList;
                //将获取到单据列表赋给OA单据数组
                OA_billsArray = array[0].taskstructlist || [];
                if(upLoadKey && OA_billsArray.length < count) {
                    //如果OA单据返回的数据小于请求数据的时候，表明再次上拉仍然返回相同数据，此时不将返回的OA列表合并到billsArray
                    //这么处理是为了迎合OA接口返回数据特点，现在如果加载数据完毕，OA列表接口仍然会返回相同的数据
                    $('#loding').hide();
                } else {
                    //从接口获取单据列表值
                    billsArray = billsArray.concat(OA_billsArray);
                }
                //渲染数据调用函数提取
                _billSearch.initDataCalledFun();
            }
        },
        /**
         * 渲染数据调用函数提取
         *
         */
        initDataWhenDataBack: function () {
            if (billsArray.length == 0) {
                noBill = true;//返回单据数目为0
            }
            if (upLoadKey) {
                if (noBill) {//当获取单据为空时
                    $('#showSearchList').find('#upLoading').find('img').attr('src', '').css('display', 'none');
                    $('#showSearchList').find('#upLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.alreadyAllDataInfo"));//'加载完成'
                } else {

                    _billSearch.addData();
                    setTimeout(function () {
                        $('#showSearchList').find('#upLoading').find('img').attr('src', 'images/up-vector.png').css('display', 'block');
                        $('#showSearchList').find('#upLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.upLoadMoreInfo"));//'上拉更多'
                    }, 500);
                }

                upLoadKey = false;
            } else {
                _billSearch.initData();
            }
        },
        //如上函数的调用函数，在OA+NC的时候要等两个都调用完毕才渲染数据
        initDataCalledFun: function () {
            //NC+ OA的时候，全部调用完毕的时候，才进行数据渲染
            if (paramUser.dataSourceSystem == 'NC+OA') {
                if (OA_NC_getBillList_flag == "2") {
                    _billSearch.initDataWhenDataBack();
                    $("#loding").hide();
                }
            } else {
                _billSearch.initDataWhenDataBack();
                $("#loding").hide();
            }
        },

        /**
         * ajax调用接口获取数据
         * 参数：接口名，参数
         * 返回值：返回数据
         */
        getDataByAjax: function (methodName, paramsObj, successCallBack, asyncValue) {

            var param = {
                serviceid: "sp63_ispservice",
                token: paramUser.nctoken,
                usercode: paramUser.ucode
            };

            eval("param." + methodName + "=" + JSON.stringify(paramsObj) + ";");

            console.log(methodName + "传入参数：" + JSON.stringify(param));
            //调用Ajax方法
            _billSearch.doAjax(param, successCallBack, asyncValue);
        },
        /**
         * ajax调用接口获取数据
         * 参数：接口名，参数
         * 返回值：返回数据
         */
        get_OA_DataByAjax: function (methodName, paramsObj, successCallBack, asyncValue) {
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode
            };
            eval("param." + methodName + "=" + JSON.stringify(paramsObj) + ";");
            console.log(methodName + "传入参数：" + JSON.stringify(param));
            //调用Ajax方法
            _billSearch.doAjax(param, successCallBack, asyncValue);
        },
        /**
         * @description 调用Ajax方法
         * @param param 传入参数
         * @param successCallBack 调用Ajax成功时回调函数
         * @param asyncValue 是否异步调用
         */
        doAjax: function (param, successCallBack, asyncValue) {

            $("#loding").show();
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                data: JSON.stringify(param),
                async: asyncValue,
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {

                    console.log("返回JSON数据串为：" + JSON.stringify(result));
                    //转化为json
                    var resultJson = eval('(' + result + ')');
                    eval("_billSearch." + successCallBack + "(" + result + ")");
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    ////console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                    _billSearch.show_error(eval("billListLang." + get_lang() + ".pageMessage.funcError"));//'执行函数失败'
                }
            });
        },
        /**
         * 初次加载单据列表数据，或者下拉刷新页面
         */
        initData: function () {
            //首先清空单据列表
            $('#showSearchList').find('tbody').html('');
            //$('#upLoading').remove();
            if (billsArray) {
                if ($('#scroller').find('#downLoading').length == 0) {
                    var downRefresh = '<div class="showbox" id="downLoading" style="display:block;">'
                        + '<div class="loadingWord">'
                        + '<img src="images/down-vector.png">'
                        + '<span class="loading_text downRefreshLable">下拉刷新</span>'
                        + '</div></div>';
                    $('#scroller').prepend(downRefresh);
                }

                if (billsArray.length == 0) {//当前单据列表为空
                    _billSearch.show_nodata(eval("billListLang." + get_lang() + ".pageMessage.noBillsCurrentPage"));//'当前列表无单据'
                    //控制批量部分的显示和隐藏
                    if (isWeiXinFlag) {
                        $("#batchLabel").hide();
                        $(".batch_mode_open").css("width", "60px");
                        $(".batch_mode_open .text").css("width", "40px");
                        $(".batch_mode_open .text a").css("border-left", "none").show();
                    } else {
                        $(".batch_mode").hide();
                    }
                } else {//当单据列表不为空

                    _billSearch.dataToHtml();//将单据列表数组中的数据转换成html,加入页面

                    if (billsArray.length >= count) {//当初始获取单据列表数目小于count,说明没有更多单据了
                        if ($('#showSearchList').find('#upLoading').length != 0) {

                            $('#showSearchList').find('#upLoading').remove();
                        }
                        //在列表最后一行加上‘上拉更多’
                        var up_more_div = '<div class="showbox" id="upLoading" style="display:block;"><div class="loadingWord"><img src="images/up-vector.png"><span class="loading_text">' + (eval("billListLang." + get_lang() + ".pageMessage.upLoadMoreInfo")) + '</span></div></div>';
                        //$('#scroller').append(up_more_div);
                        $('#showSearchList').append(up_more_div);

                    } else {
                        $('#showSearchList').find('#upLoading').remove();
                    }
                }

                //列表可滑动
                //1.为iscroll框赋高度
                var header_height = $('#header').height();
                var footer_height = $('#footer').height();
                //var wrapper_height = window_height - header_height - footer_height;
                var wrapper_height = window_height - footer_height;
                $('#wrapper').css('height', wrapper_height);
                _billSearch.initIScroll();

            } else {
                _billSearch.show_error(eval("billListLang." + get_lang() + ".pageMessage.resultNull"));//'接口返回为null'
            }
            _billSearch.billClickEvent();//点击单据时绑定事件
        },
        /**
         *将查询出来的数据，单据列表保存在全局变量billsArray
         * 功能：将数组显示在页面上
         */
        addData: function () {
            _billSearch.dataToHtml();
            //列表高度增加，需重新初始化滑动iscroll
            _billSearch.initIScroll();

        },
        /**
         * 将单据列表数组中的数据转换成html,加入页面
         */
        dataToHtml: function () {
            var i, len,
                keywords = $("#search_result_on_input").val().trim(), //搜索关键字
                replaceObj;//关键字通配符
            try {
                replaceObj = eval("/" + keywords + "/g");
            } catch (e) {
                replaceObj = null;
                _billSearch.show_error("请去除特殊字符后重试");
                return;
            }
            var _width = $(window).width(),
                rightWidth = parseInt(2 * _width) * 0.95 - 20,
                split8PartWidth = Math.floor(rightWidth / 16),
                fontNumEach = Math.floor(split8PartWidth * 12 / 15),
                item, taskid, title, date,
                pointFlagHtml = "",
                oneBill = "";
            if (pagesCode[pageIndex] == "ishandled" && buttonsCode[headerBtnIndex] == "unhandled") { // 只有“我的任务”-“待办”需要蓝点
                pointFlagHtml = '<div class="nc_radius"></div>';
                $(".batch_mode").show();
            } else {
                pointFlagHtml = '<div></div>';
                $(".batch_mode").hide();
                $(".batch_mode_open").hide();
            }

            //将数据渲染列表
            for (i = 0,len=NC_billsArray.length; i<len; i++) {
                item = NC_billsArray[i];
                taskid = item.taskid;
                // 将搜索关键字变为红色
                title = item.title;
                title = _billSearch.substrLength(title, fontNumEach).replace(replaceObj, '<font style="color:red;">' + keywords + '</font>');
                date = item.date.substr(5, 11).replace(replaceObj, '<font style="color:red;">' + keywords + '</font>');
                oneBill += '<tr><td></td><td></td></tr>'
                    + '<tr class="bill" id="billRowId_' + currentCountId + '"  data-system="NC" data-taskid="' + taskid + '">'
                    + '<td width="5%" align="right" valign="top">' + pointFlagHtml + '</td>'
                    + '<td>'
                    + '<span class="nc_name" data-system="NC" data-taskid="' + taskid + '">' + title + '<span class="nc_color nc_margin">' + date + '</span></span>'
                    + '</td>'
                    + '</tr>'
                    + '<tr>'
                    + '<td></td>'
                    + '<td style="border-bottom:#e9e9e9 solid 1px;"></td>'
                    + '</tr>';
                currentCountId++;
            }

            for (i = 0,len=OA_billsArray.length; i<len; i++) {
                item = OA_billsArray[i];
                taskid = item.taskid;
                // 将搜索关键字变为红色
                title = item.title;
                title = _billSearch.substrLength(title, fontNumEach).replace(replaceObj, '<font style="color:red;">' + keywords + '</font>');
                date = item.date.substr(5, 11).replace(replaceObj, '<font style="color:red;">' + keywords + '</font>');
                oneBill += '<tr><td></td><td></td></tr>'
                    + '<tr class="bill"  id="billRowId_' + currentCountId + '" data-system="OA" data-taskid="' + taskid + '">'
                    + '<td width="5%" align="right" valign="top"><!--<div class="nc_radius"></div>--></td>'
                    + '<td>'
                    + '<span class="nc_name" data-taskid="' + taskid + '">' + title + '<span class="nc_color nc_margin">' + date + '</span></span>'
                    + '</td>'
                    + '</tr>'
                    + '<tr>'
                    + '<td></td>'
                    + '<td style="border-bottom:#e9e9e9 solid 1px;"></td>'
                    + '</tr>';
                currentCountId++;
            }
            $('#showSearchList').find('tbody').append(oneBill);
        },
        /**
         *弹性滚动
         */
        initIScroll: function () {
            if (typeof(_iscroll) != "undefined") {
                _iscroll.destroy();
            }
            releaseKey = false;//标记拉动是否释放，默认false,释放true,只有释放后才能更新页面数据
            downLoadKey = false;//下拉加载数据可用true,禁用false
            upLoadKey = false;//上拉加载数据可用true,禁用false
            mark_i = 0;//标识是否第一次开始下拉，第一次不用转动箭头
            _iscroll = new iScroll('wrapper', {
                scrollbarClass: 'myScrollbar',
                checkDOMChanges: true,
                //开始滚动时回调
                onScrollMove: function () {
                    ////console.log(this.y);
                    var _y = this.y;//下拉距离
                    var _max = (this.maxScrollY) * (-1);//最大的下拉距离,负值
                    //console.log('_y:'+_y+'  _max:' + _max+' mark_i:'+mark_i);

                    //页头---下拉刷新
                    if (_y > 0 && _y < 40) {//显示'下拉刷新'
                        if (mark_i > 0) {
                            //$('#downLoading').find('img').animate({transform:'rotate(-0deg)'},200);
                            $('#downLoading').find('img').animate({
                                'transform': 'rotate(-0deg)',
                                '-ms-transform': 'rotate(-0deg)',
                                '-moz-transform': 'rotate(-0deg)',
                                '-webkit-transform': 'rotate(-0deg)',
                                '-o-transform': 'rotate(-0deg)'
                            }, 200);
                        }
                        //$('#downLoading').find('img').attr('src', 'images/down-vector.png');
                        $('#downLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.downRefresh"));//'下拉刷新'
                        releaseKey = false;
                    } else if (_y >= 40) {
                        mark_i++;
                        //$('#downLoading').find('img').animate({transform:'rotate(180deg)'},200);
                        $('#downLoading').find('img').animate({
                            'transform': 'rotate(180deg)',
                            '-ms-transform': 'rotate(180deg)',
                            '-moz-transform': 'rotate(180deg)',
                            '-webkit-transform': 'rotate(180deg)',
                            '-o-transform': 'rotate(180deg)'
                        }, 200);

                        //$('#downLoading').find('img').attr('src', 'images/up-vector.png');
                        $('#downLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.releaseUpdate"));//'释放更新'
                        releaseKey = true;
                        downLoadKey = true;
                    } else if ((-_y) > _max) {//_max
                        //页脚---上拉加载更多
                        //alert('上拉刷新');
                        //$('#upLoading').find('.loading_text').html('上拉更多');
                        releaseKey = true;
                        upLoadKey = true;
                    }

                },
                vScrollbar: true,
                //手离开屏幕时回调
                onTouchEnd: function () {
                    ////console.log('手离开屏幕：' + this.y);
                    if (releaseKey) {//手释放了
                        //下拉刷新数据
                        if (downLoadKey) {
                            OA_NC_getBillList_flag = 0;////OA+NC标志，2表示两个类型列表接口都调用完,初始化值为0
                            $('#scroller').css('top', '39px');
                            $('#downLoading').find('img').attr('src', 'images/waiting.gif');
                            $('#downLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.loadingInfo"));//'加载中...'
                            //获取新数据，显示在页面上
                            _billSearch.getBillList(paramData.pagesCode, paramData.buttonsCode, 1);
                            ////console.log('刷新页面数据');
                            //_billSearch.initData();
                            downLoadKey = false;
                        }
                        //上拉加载更多数据
                        if (upLoadKey) {
                            OA_NC_getBillList_flag = 0;////OA+NC标志，2表示两个类型列表接口都调用完,初始化值为0
                            $('#showSearchList').find('#upLoading').find('img').attr('src', 'images/waiting.gif').css('display', 'block');
                            $('#showSearchList').find('#upLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.loadingInfo"));//'加载中...'
                            //获取新数据，显示在页面上
                            _billSearch.getBillList(paramData.pagesCode, paramData.buttonsCode)
                        }

                        releaseKey = false;

                    }

                    //不论是否刷新数据，都要隐藏loading栏---页头
                    setTimeout(function () {
                        $('#scroller').css('top', '-1px');
                        mark_i = 0;
                        $('#downLoading').find('img').attr('src', 'images/down-vector.png');
                        //$('#downLoading').find('img').css('transform','rotate(0deg)');
                        $('#downLoading').find('img').css({
                            'transform': 'rotate(0deg)',
                            '-ms-transform': 'rotate(0deg)',
                            '-moz-transform': 'rotate(0deg)',
                            '-webkit-transform': 'rotate(0deg)',
                            '-o-transform': 'rotate(0deg)'
                        });
                        $('#downLoading').find('.loading_text').html(eval("billListLang." + get_lang() + ".pageMessage.downRefresh"));//'下拉刷新'
                    }, 500);
                }
            });
        },
        /**
         * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
         */
        lightAppMultilingual: function () {
            //首先设置title
            var $body = $('body');
            document.title = eval("billListLang." + get_lang() + ".pageTitle");
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);

            //然后设置页面显示的汉字
            for (var i in eval("billListLang." + get_lang() + ".pageContent")) {
                //i即属性名字ok,close
//				//console.log("key===" + i + ",value==" + eval("billListLang." + get_lang() + ".pageContent." + i));
                $("." + i).html(eval("billListLang." + get_lang() + ".pageContent." + i));
            }
            //再设置页面中的placeholder中的汉字
            for (var i in eval("billListLang." + get_lang() + ".pagePlaceHoder")) {
                //i即属性名字ok,close
//				//console.log("placeholder key===" + i + ",value==" + eval("billListLang." + get_lang() + ".pagePlaceHoder." + i));
                $("." + i).attr("placeholder", eval("billListLang." + get_lang() + ".pagePlaceHoder." + i));
            }
        },
        /**
         * 判断字符是否为0-9、a-z、A-Z，是返回true,否返回false
         * 传入参数：一个字符char_c
         */
        isAZaz09: function (char_c) {
            var reg = /^[\u4E00-\u9FA5]+$/;
            if (!reg.test(char_c)) {
                //console.log("char_c=== " + char_c + " 不是中文");
                return true;
            }
            //console.log("char_c=== " + char_c + " 是中文");
            return false;
        },
        /**
         * 参数：str需要截取的字符串
         * 功能：若str长度大于等于28则截取前28个字符，若字符串str长度小于28则后面补上空格凑足28位
         * 返回：28位的字符串
         */
        substrLength: function (str, len) {
            var str_len = 0;
            var res_str = str;
            var cut_pos = len;
            var cut_pos_add_flag = true;
            var cut_pos_length = 2 * cut_pos;
            if (str) {
                var i = 0;
                for (i = 0; i < str.length; i++) {
                    if (_billSearch.isAZaz09(str[i])) {//字符为0-9、a-z、A-Z
                        str_len++;
                    } else {
                        str_len += 2;
                    }
                    if (str_len >= 2 * len && cut_pos_add_flag) {
                        cut_pos = i;
                        cut_pos_length = str_len;
                        cut_pos_add_flag = false;
                    }
                }
                //console.log("str== " + str.length + ",len==" + len + ",str_len==" + str_len + ",cut_pos==" + cut_pos);
                if (str_len > cut_pos_length) {//字符串过长，截取，加...
                    res_str = str.substr(0, cut_pos);
                    res_str += '...';
                }
            }

            return res_str;
        },
        /**
         * 数据长度为0时，提示无数据
         */
        show_nodata: function (message) {
            $('#wrapper').find('.error-none').remove();
            $('#showSearchList').find('#upLoading').remove();
            var window_height = document.documentElement.clientHeight;
            var window_width = document.documentElement.clientWidth;
            var _top = (window_height - 39 - 50) * 0.33;
            var _height = window_height - _top;
            var no_data = $('<div class="error-none" style="padding-top:' + _top + 'px;' + 'height:' + _height + 'px;">'
                + '<table width="' + window_width + 'px" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="nodata_img" src="images/no_data.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            if (paramData.pagesCode) {
                $("#showSearchList").find('tbody').html("").append(no_data);//#billList tbody  //.nc_list
            } else {
                $('#scroller').html("").append(no_data);
            }
            //$('#wrapper').append(no_data);

            //$(".batch_mode").css("display","none");
        },
        /**
         * 报错时提示
         */
        show_error: function (message) {
            $('#wrapper').find('.error-none').remove();
            $('#showSearchList').find('#upLoading').remove();
            var window_height = document.documentElement.clientHeight;
            var window_width = document.documentElement.clientWidth;
            var _top = (window_height - 39 - 50) * 0.33;
            var _height = window_height - _top;
            var error_data = $('<div class="error-none" style="padding-top:' + _top + 'px;' + 'height:' + _height + 'px;">'
                + '<table width="' + window_width + 'px" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            if (paramData.pagesCode) {
                $("#showSearchList").find('tbody').html("").append(error_data);
            } else {//当后台服务停了，paramData.pagesCode还不存在时
                $('#scroller').html("").append(error_data);
            }
            //$('#wrapper').append(error_data);

            //$(".batch_mode").css("display","none");
        },
        /**
         * 整体报错时提示
         */
        body_showError: function (message) {
            var window_height = document.documentElement.clientHeight;
            var _top = (window_height - 29 - 50) * 0.33;
            var error_data = $('<div class="error-none" style="padding-top:' + _top + 'px;height:100%;">'
                + '<table width="100%" height="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            $("body").html("").append(error_data);
            //$(".batch_mode").css("display","none");
        }

    }


    return _billSearch;
});
/**
 * 获取URL的contextPath
 * @param
 * @returns
 */
function contextPath() {
    var origin = window.location.protocol + '//' + window.location.host;
    var pathname = location.pathname;
	//var projectname = pathname.substr(0, pathname.indexOf('/', 1));
	var projectname = pathname.substr(0, pathname.indexOf('/', 0));
    return origin + projectname;
}
/**
 * 判断是否默认选项
 */
function checkUndefined(arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == "" || typeof(arr[i]) == "undefined" || arr[i] == null) {
            return true;
        }
    }
    return false;
}


//取得浏览器语言，用于多语系判断
var get_lang = function () {
    var lang = "en";
    var navLang;//系统语言标识
    var type = navigator.appName;
    if (type == "Netscape") {
        navLang = navigator.language;
    }
    else {
        navLang = navigator.userLanguage;
    }
    //alert(navLang);
    if (navLang == "zh-cn" || navLang == "zh-CN") {//中文简体
        lang = "zh";
    } else if (navLang == "zh-tw" || navLang == "zh-TW" || navLang == "zh-hk" || navLang == "zh-HK") {//中文繁体（包括香港繁体和台湾繁体）
        lang = "tw";
    }
    //alert(lang);
    return lang;
};
//	////console.log("您的浏览器语言是：" + get_lang());
var setCookie = function (name, value) {
    var Days = 30;
    var exp = new Date();
    exp.setTime(exp.getTime() + Days * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + escape(value) + ";expires=" + exp.toGMTString();
};
var getCookie = function (name) {
    var arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg))
        return unescape(arr[2]);
    else
        return null;
};
//判断为微信浏览器
function isWeiXin() {
    var ua = window.navigator.userAgent.toLowerCase();
    if (ua.match(/MicroMessenger/i) == 'micromessenger') {
        return true;
    } else {
        return false;
    }
}
/**
 * 解析URL攜帶的?之後的參數，轉換為對象，返回之
 * @param location
 * @returns
 */
var getURLparams = function () {
    var o = {};
    if (location.search) {
        var search_params = location.search.substr(1).split('&');
        if (search_params) {
            $.each(search_params, function (i) {
                o[this.split('=')[0]] = decodeURIComponent(this.split('=')[1]);
            });
        }
    }
    return o;
};
