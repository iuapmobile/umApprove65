define(["jquery", "iscroll", "bgydialog"], function ($, isc, dialog) {
    var paramUser = JSON.parse(window.sessionStorage.paramUser);
    var clientParam = JSON.parse(window.sessionStorage.clientParam);
    var paramData = getURLparams();
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
    
    // 防止多次点击
    window.AllowDoActionFun=true ;
    //历史手写改写为n
    window.sessionStorage.historyFlag = "n";
    // 手写签名模块
    var _handWrite = {
        init: function() {
            $.noConflict();
            _handWrite.show();
            _handWrite.initStyle();
            _handWrite.eventsBind();
        },

        initStyle: function() {
            $(document).ready(function () {
                _handWrite.$sigdiv = $("#signature").jSignature({'UndoButton':true});
                //初始化高度
                var _height=$(window).height();
                var _width=$(window).width();
                //footer宽高
                $(".footer").width(_width);
                //画布高度
                var canvasHeight = _height - 75;
                $(".jSignature").attr("height",canvasHeight).css("height", canvasHeight + "px");

                //初始化重置画布对象
                _handWrite.$sigdiv.jSignature('reset');

                var setDataStr = window.sessionStorage.handWriteData;
                var dataStr = ["image/png;base64", setDataStr];
                _handWrite.$sigdiv.jSignature('setData', "data:" + dataStr);
            });
        },

        eventsBind: function() {
            //确定按钮点击
            $("#OAHandWrite_submit").on('click', function(){
                //产生的图片
                var data = _handWrite.$sigdiv.jSignature('getData', "image");
                //保存到缓存
                window.sessionStorage.handWriteData = data[1];
                $('#handWrite').hide();
            });

            //取消按钮点击
            $("#OAHandWrite_cancel").unbind().on('click', function(){
                $('#handWrite').hide();
            });
            //加上撤销事件监听
            $(".revoke").unbind().on("click",function(){
                $("#undoLastInput").click();
            });
        },

        show: function() {
            $('#handWrite').show();
        }
    };

    //显示已选择模块
    var _alreadySelected = {
        init: function (actionName, code, clickId) {
            //记录当前code
            window.sessionStorage.currentOptCode = clickId;
            _alreadySelected.showSelectedDiv();//显示该页面
            _alreadySelected.eventsBind(code, clickId);
            _alreadySelected.initData(actionName, clickId);//初始化页面数据
        },
        //初始化页面，显示已选人员
        initData: function (actionName, clickId) {
            //显示审批动作
            $("#selectDivKey_actionName").text(actionName + ' :');

            var $nowUserList = $("#" + clickId + "_List");
            $("#alSelectedPersons").html('').append($nowUserList.html());
        },
        /**
         * 绑定事件
         */
        eventsBind: function (code, clickId) {
            //点击跳转到选择页面
            $("#showUserList").unbind().on('click', function () {
                //_select.showSelectDiv();
                //获取选择人员列表
                _alreadySelected.initPersonList(code, clickId, $(this));
                //隐藏当前弹出框，显示指派列表弹出框
                //$("#assign_count").hide();
                //$("#contact_person_count").html($("#selectItems").html());
                //$("#userList").show();
            });

            //确定
            $("#alSelectedDiv_submit").unbind().on('click', function () {
                //获取到已选节点
                var $userList = $("#alSelectedPersons");
                //需修改，杨颖
                $("#" + clickId + "_List").html('').append($userList.html());
                //显示抄送人数
                $("#" + clickId + "_Sum").html($userList.find('span').length)
                //显示审批动作页面
                _select.showDoActionDiv();
                //小窗口隐藏
                $("#assign_count").hide();
            });

            //取消
            $("#alSelectedDiv_cancel").unbind().on('click', function () {
                //显示审批动作页面
                _select.showDoActionDiv();
                //小窗口隐藏
                $("#assign_count").hide();
            });
        },
        /**
         * 显示已选择人员
         */
        showSelectedDiv: function () {
            //显示已选择人员页面
            $("#alreadySelected").show();
            //显示小窗口
            $("#assign_count").show();
            //大窗口隐藏
            $(".assign_modalOA").hide();
        },
        /**
         * 查询人员列表
         */
        initPersonList: function (code, clickId, $this) {
            //记录当前code
            window.sessionStorage.currentOptCode = clickId;
            _alreadySelected.loadPersonList(code, clickId, 25, "", function (userList) { //成功回调
                //隐藏列表
                $(".assign_modalOA").hide();
                if (code == "doReject" && clickId == "reject") {//驳回
                    _singleSelect.init("_alreadySelected", userList, "getRejextListFun", $this);
                } else {
                    if (code == "doReassign" && clickId == "reassign") {//转移
                        _select.init("_alreadySelected", userList, "getReassignListFun", $this);
                    } else {
                        _select.init("_alreadySelected", userList, "UserListFun", $this);
                    }
                }
            }, function (err) {//失败回调

            });
        },
        /**
         * 根据条件查询用户列表
         * @param code 审批动作，已阅->doAgreeRead ，同意->doAgree，驳回->doReject，转移->doReassign，前加签->doAddApprove，终止->doTerminal
         * @param clickId 审批动作，驳回->reject
         * @param count 请求人员数目
         * @param condition 模糊查询条件，根据用户name和code进行模糊查询
         * @param successfulCb 请求成功回调，参数为请求完成的用户列表
         * @param failureCb 请求失败回调，参数为请求失败的描述
         */
        loadPersonList: function (code, clickId, count, condition, successfulCb, failureCb) {
            var param,
                list,
                userList,
                desc;
            $("#loding").show();
            //驳回人列表,当动作是驳回，点击驳回选择驳回人员列表
            if (code == "doReject" && clickId == "reject") {
                param = {
                    serviceid: "oa_sp63_ispservice",
                    token: paramUser.oatoken,
                    usercode: paramUser.ucode,
                    getRejectNodeList: {
                        groupid: paramUser.groupid,
                        userid: paramUser.userid,
                        taskid: paramData.taskid,
                        startline: 1,
                        count: count || 25,
                        condition: condition || ""
                    }
                };
                //获取同组人员列表
            } else {
                param = {
                    serviceid: "oa_sp63_ispservice",
                    token: paramUser.oatoken,
                    usercode: paramUser.ucode,
                    getUserList: {
                        groupid: paramUser.groupid,
                        userid: paramUser.userid,
                        taskid: paramData.taskid,
                        startline: 1,
                        count: count || 25,
                        condition: condition || ""
                    }
                };
            }

            console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    $("#loding").hide();
                    if(typeof result != 'object') {
                        result = eval('(' + result + ')');
                    }
                    console.log("查询同组人员列表 返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != '0') { //失败
                        if (typeof failureCb === 'function') {
                            (result.desc) ? failureCb(result.desc) : failureCb(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.designeeListfailed")); //指派人员列表加载失败
                        }
                    } else {
                        list = (code == "doReject" && clickId == "reject") ? result.jsonDatas.getRejectNodeList : result.jsonDatas.getUserList;
                        if (!list || !list.length || list[0].flag != '0') { // 均视为失败
                            if (typeof failureCb === 'function') {
                                try {
                                    desc = list[0].desc;
                                } catch (e) {
                                    desc = eval("OAdoActionLang." + paramUser.lang + ".pageMessage.designeeListfailed");
                                } finally {
                                    failureCb(desc);
                                }
                            }
                        } else { // 成功
                            userList = list[0].psnstructlist;
                            if (typeof successfulCb === 'function') {
                                successfulCb(userList);
                            }
                        }
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('获取人员列表失败');
                    //加载样式处理
                    $("#loding").hide();
                    if (typeof failureCb === 'function') {
                        failureCb(textStatus);
                    }
                }
            });
        },
        /**
         * 选择完人员后点击提交回调函数
         */
        UserListFun: function (selectArray) {
            var Users = "";
            //遍历selectArray
            for (var i = 0; i < selectArray.length; i++) {
                //将选择活动加入指派列表
                Users += "<span class='cc_copy' data-id='" + selectArray[i].id + "'>" + selectArray[i].name + "</span>";

            }
            $('#alSelectedPersons').html('').append(Users);
        },
        /**
         * 转移时单项选择人员
         */
        getReassignListFun: function (selectItem, $thisItem) {
            $("#reassignPerson").text(selectItem[0].name).attr('data-id', selectItem[0].id).show();
        },
        /**
         * 驳回时单项选择人员
         */
        getRejextListFun: function (selectItem, $thisItem) {

            var name = selectItem instanceof Array ? selectItem[0].name : selectItem.name;
            var id = selectItem instanceof Array ? selectItem[0].id : selectItem.id;
            if (id != undefined && id != "") {
                $("#rejectPerson").text(name).attr('data-id', id).show();
            } else {
                $("#rejectPerson").hide();
            }
        }
    };

    //单项选择模块
    var _singleSelect = {
        /**
         * 初始化
         * @param string thisObject 调用单项选择页面的对象
         * @param Object itemList 需要显示的数组（有id,name属性）
         * @param string submitFun 点击提交按钮后的回调函数，注意：是字符串
         * @param Object $clickItem 调用选择时点击的对象
         */
        init: function (thisObject, itemList, submitFun, $clickItem) {
            _singleSelect.initStyle();//初始化页面样式
            _singleSelect.showSingleSelectDiv();//显示单项选择页面
            _singleSelect.initData(itemList);//初始化页面数据
            _singleSelect.eventsBind(thisObject, submitFun, $clickItem);//初始化页面数据
        },
        /**
         * 初始化页面样式
         */
        initStyle: function () {
            var documentHeight = $(document).height();
            var headerHeight = $(".search").height();
            var footerHeight = $(".bottom_submit").height();
            $("#singleSelectItems").height(documentHeight * 0.6 - headerHeight - footerHeight);
            //初始化搜索框显示
            //$("#selectDiv .search").show();
        },
        /**
         * 初始化页面数据
         */
        initData: function (itemList) {
            var list = "";
            var singleSelectItems = $("#rejectPerson").attr("data-id");
            for (var i = 0; i < itemList.length; i++) {
                //list += "<li>"+ itemList[i].name +"<span class='inputno'></span></li>"
                if (singleSelectItems != undefined && singleSelectItems.indexOf(itemList[i].id) >= 0) {
                    list += "<li data-id='" + itemList[i].id + "' data-code='" + itemList[i].code + "'><span class='inputno selected'></span>" + itemList[i].name + "</li>"
                } else {
                    list += "<li data-id='" + itemList[i].id + "' data-code='" + itemList[i].code + "'><span class='inputno'></span>" + itemList[i].name + "</li>"
                }
            }
            $("#singleSelectItems").html("").html(list);
            /*
             //是否有已选项，如有已选项显示出来
             var index = $("#aprovalNote").attr('data-id');
             if(index){
             $("#singleSelectItems li").eq(index).find("span").trigger('click');
             }*/
        },
        /**
         * 绑定事件
         */
        eventsBind: function (thisObject, submitFun, $clickItem) {
            //单项选择点击事件
            $("#singleSelectItems").unbind().on('click', 'li', function () {
                $(this).find('span').toggleClass('selected').closest('li').siblings('li').find('span').removeClass('selected');
            });

            //确定
            $("#singleSelect_submit").unbind().on('click', function () {
                var $selectedItem = $("#singleSelectItems li span.selected");
                var selectItem = {};
                selectItem.id = $selectedItem.closest('li').attr("data-id");
                selectItem.name = $selectedItem.closest('li').text();

                _select.showDoActionDiv();//显示审批动作页面

                if (selectItem.id == undefined) {
                    selectItem.id = "";
                }

                //调用submitFun函数
                eval(thisObject + "." + submitFun + "(selectItem, $clickItem)");
                //隐藏人员列表
                $("#singleSelectDiv").hide();
            });
            //取消
            $("#singleSelect_cancel").unbind().on('click', function () {
                //隐藏选择块，显示审批动作页面
                _select.showDoActionDiv();
            });

            $('#singleSelectItems_search').unbind().on('keydown', function(e) {
                var code = e.keyCode || e.which;
                if(code === 13) {
                    e.preventDefault();
                    return false;
                }
            });
        },
        /**
         * 显示单项选择页面
         */
        showSingleSelectDiv: function () {
            $("#alreadySelected").show();
            //大窗口隐藏
            $(".assign_modalOA").hide();
            //显示指定的
            $("#singleSelectDiv").show();//.siblings('div').hide();
            //清空查询
            $("#selectItems_search").val("");
            $("#singleSelectItems_search").val("");
        }
    };

    //搜索模块
    var _searchDiv = {
        /**
         * 初始化
         */
        init: function (code) {
            _searchDiv.initStyle();//初始化样式
            _searchDiv.showSearchDiv();
            _searchDiv.initData();//初始化数据，显示在列表里
            _searchDiv.eventsBind(code);
        },
        /**
         * 初始化样式
         */
        initStyle: function () {

        },
        /**
         * 初始化数据
         */
        initData: function () {
            //清空搜索框
            $("#searchDiv_input")[0].value = '';

            //初始化搜索历史数据
            var searchArray = window.localStorage.searchArray;
            //第一次搜索，加入全部
            if (searchArray == undefined) {
                searchArray = '全部';
                window.localStorage.searchArray = searchArray;
            }
            searchArray = searchArray.split(',');
            //将搜索历史加入页面
            var searchList = '';
            for (var i = 0; i < searchArray.length; i++) {
                searchList += "<li>" + searchArray[i] + "</li>";
            }
            $("#searchDivItems").html('').append(searchList);

        },
        /**
         * 绑定模块事件
         */
        eventsBind: function (code) {
            //取消
            $('#cancelSearch').unbind().on('click', function () {
                //回调显示上个页面
                _select.showSelectDiv();//显示多项选择页面
            });

            //搜索查询
            $("#searchDiv_input").unbind().on('keydown', function (e) {
                if (e.keyCode == 13) {//回车或搜索
                    //加入搜索历史
                    var searchArray = window.localStorage.searchArray ? window.localStorage.searchArray : [];
                    searchArray = searchArray.split(',');

                    //如果该字符串在搜索历史中，不需要再记一遍，直接将该字符串换到最前
                    if (!searchArray.indexOf) {
                        searchArray.prototype.indexOf = function (el) {
                            for (var i = 0, n = this.length; i < n; i++) {
                                if (this[i] === el) {
                                    return i;
                                }
                            }
                            return -1;
                        }

                    }

                    //查询历史中不存在该字符串时，直接加入该字符串；存在该字符串时，将该字符串移到最前
                    var itemIndex = searchArray.indexOf(this.value);
                    if (itemIndex == -1) {
                        if (searchArray.length >= 6) {
                            searchArray.splice(4, 1);//删除第二个元素，第一个元素是全部
                        }
                        searchArray.unshift(this.value);
                    } else {
                        searchArray.splice(itemIndex, 1);//删除该元素
                        searchArray.unshift(this.value);//将元素放到第一个
                    }

                    window.localStorage.searchArray = searchArray;

                    //搜索
                    _searchDiv.initSelectPersonList(this.value, code);
                }
            });

            //查询搜索历史
            $("#searchDivItems").unbind().on('click', 'li', function () {
                var selectCondition = '';
                if ($(this).text() != '全部') {
                    selectCondition = $(this).text();
                }
                //搜索
                _searchDiv.initSelectPersonList(selectCondition, code);
            });
        },
        /**
         * 显示搜索模块
         */
        showSearchDiv: function () {
            $("#searchDiv").show().siblings('div').hide();
            //初始化的时候，输入框自动获取焦点
            document.getElementById("searchDiv_input").focus();
        },
        /**
         * 查询人员列表
         */
        initSelectPersonList: function (selectCondition, code) {

            //获取同组人员列表
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getUserList: {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    taskid: paramData.taskid,
                    startline: 1,
                    count: 999,
                    condition: selectCondition ? selectCondition : ''
                }
            };

            console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    if(typeof result == 'object') {
                        result = eval('(' + result + ')');
                    }
                    console.log("查询同组人员列表 返回JSON数据串为：" + JSON.stringify(result));
                    {
                        var userList = result.jsonDatas.getUserList[0].psnstructlist;
                        if (code == 'reassign') {
                            _select.init("_alreadySelected", userList, "getReassignListFun", $("#searchDiv_input"));
                        } else {
                            _select.init("_alreadySelected", userList, "UserListFun", $("#searchDiv_input"));
                        }

                    }

                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });

        }
    };


// vvv4
    //多项选择模块
    var _select = {

        /**
         * 初始化
         * @param string thisObject 调用选择页面的对象
         * @param Object itemList 需要显示的数组（有id,name属性）
         * @param string submitFun 点击提交按钮后的回调函数，注意：是字符串
         * @param Object $clickItem 调用选择时点击的对象，主要用于指派每个项目选指派人
         */
        init: function (thisObject, itemList, submitFun, $clickItem) {
            _select.initStyle();//初始化样式
            _select.showSelectDiv();
            _select.initData(itemList, submitFun);//初始化数据，显示在列表里
            _select.eventsBind(thisObject, submitFun, $clickItem);
        },
        /**
         * 初始化样式
         */
        initStyle: function () {
            var documentHeight = $(document).height();
            var headerHeight = $(".search").height();
            var footerHeight = $(".bottom_submit").height();
            $("#selectItems").height(documentHeight * 0.6 - headerHeight - footerHeight);
            //初始化搜索框显示
            $("#selectDiv .search").show();
        },
        /**
         * 初始化数据，显示在列表里
         */
        initData: function (itemList, submitFun) {

            $("#selectItems").html("");
            var list = "";
            var alSelectedPersonsHtml = "",
                alSelectedPersonsArray = null;
            //还有去的父亲id
            var activityid = window.sessionStorage.activityid;
            //根据情况进行去的
            if (submitFun == "ActivityListFun") {
                alSelectedPersonsHtml = $("#assignActivity").html() || "";
            } else if (submitFun == "UsersOfActivityListFun") {
                alSelectedPersonsHtml = $("#assignActivity").find("li[data-id='" + activityid + "']").html() || "";
                alSelectedPersonsArray = $("#assignActivity").find("li[data-id='" + activityid + "'] span.cc_people");
            } else if (submitFun == "UserListFun") {
                alSelectedPersonsHtml = $("#alSelectedPersons").html() || "";
                alSelectedPersonsArray = $("#alSelectedPersons span");
            }

            var isAppended = alSelectedPersonsArray && alSelectedPersonsArray.length;
            // 已选人员显示在前面
            if(isAppended) {
                alSelectedPersonsArray.each(function(index, item) {
                    var id = $(item).attr('data-id'),
                        text = $(item).text(),
                        code = text.split(' ')[1];
                    list += "<li data-id='" + id + "' data-code='" + code + "'><span class='inputno selected'></span>" + text + "</li>";
                });
            }

            //列表人员显示name+code
            for (var i = 0, len=itemList.length; i < len; i++) {
                var item = itemList[i],
                    selectedStyle = 'inputno';
                if (alSelectedPersonsHtml.indexOf(item.name + ' ' + item.code) >= 0) {
                    if(isAppended) {    // 已选人员已经显示
                        continue;
                    }
                    selectedStyle += ' selected';
                }
                list += "<li data-id='" + item.id + "' data-code='" + item.code + "' data-isendevent='" + item.isendevent + "' data-isradio='" + item.isradio + "' data-assignedByGateWay='" + item.assignedByGateWay + "' data-assign='" + item.assign + "'><span class='" + selectedStyle + "'></span>" + item.name + " " + item.code + "</li>"
            }
            $("#selectItems").html(list);

        // kkk1 ;
        // *** 菱形节点 不勾选由下一步指派 ------ 默认下面的子节点被选中 , 且不能取消 ;
            if( submitFun=='ActivityListFun' ){
                $.each($("#selectItems").find('li') , function( k,v ){

                    var pd = $(v).attr('data-assignedByGateWay') ;
                   
                    if(pd=='undefined'){return};

                    if( /^Y$/i.test(pd)==false ){
                        $(v).find('span').addClass('selected').addClass('cant_choost')
                    }
                })
            };

            //指派活动列表和指派人员选择时，影藏搜索框
            if (submitFun == 'ActivityListFun') {
                $("#selectDiv .search").hide();
            }

        },
        /**
         * 绑定事件
         * @param submitFun string 表示提交后执行的回调函数
         */
        eventsBind: function (thisObject, submitFun, $clickItem) {
            // 搜索框点击回车/Go/开始时进行后台模糊查询
            $('#selectItems_search').unbind().on("keydown", function (event) {
                var searchkey = $(this).val().trim(),
                    code,
                    clickId,
                    isSelected, // 是否添加进入列表的标志
                    person; // 待插入人员
                if (event.keyCode == 13) {
                    if (submitFun == 'UsersOfActivityListFun') {
                        event.preventDefault();
                        return false;
                    }
                    if (searchkey !== "" && _chart.stripscript(searchkey)) {
                        dialog.log("请去掉特殊字符");
                        event.preventDefault();
                        return false;
                    }
                    $(this).blur();
                    code = paramData.code;
                    clickId = window.sessionStorage.currentOptCode;
                    _alreadySelected.loadPersonList(code, clickId, 100000, searchkey, function (userList) { // 此处写100,000只是为了确保请求全部人员
                        $('#selectItems li').hide(); //先隐藏已有的列表项
                        if (!userList || !userList.length) {
                            event.preventDefault();
                            return false;
                        }
                        userList.forEach(function (item) {
                            isSelected = false;
                            $('#selectItems li').each(function (index, value) { // 重复的人员直接显示，不插入
                                if (value.dataset.id == item.id) {
                                    $(value).show();
                                    isSelected = true;
                                }
                            });
                            if (!isSelected) { // 未被选中的直接插入
                                person = $("<li data-id='" + item.id + "' data-code='" + item.code + "'><span class='inputno'></span>" + item.name + " " + item.code + "</li>");
                                $('#selectItems').prepend(person);
                            }
                        });
                    }, function (err) {

                    });
                    event.preventDefault();
                    return false;
                }
            });
            if (submitFun == "getReassignListFun" || /^[Yy]$/.test($clickItem.attr('data-isradio'))) {
                //转移时或指定了应该单选时单项选择点击事件
                $("#selectItems").unbind().on('click', 'li', function () {
                    // 不能被选
                    if($(this).find('span').hasClass('cant_choost')){
                        return
                    }
                    $(this).find('span').toggleClass('selected').closest('li').siblings('li').find('span').removeClass('selected');
                });
            } else {
                //多项选择项点击事件
                $("#selectItems").unbind().on('click', 'li', function () {
                    // 不能被选
                    if($(this).find('span').hasClass('cant_choost')){
                        return
                    }
                    $(this).find('span').toggleClass('selected');
                });
            }
            //取消选择事件
            $("#selectDiv_cancel").unbind().on('click', function () {
                //隐藏选择块，显示审批动作页面
                $("#selectDiv").hide();
                //去的当前code
                var clickId = window.sessionStorage.currentOptCode;
                //隐藏蒙版,根据情况来
                if (clickId == "assignIcon" || clickId == "reassign") {
                    $("#alreadySelected").hide();
                }
            });

            //提交选择事件
            $("#selectDiv_submit").unbind().on('click', function () {
                var selectArray = [];
                var $selectedItems = $("#selectItems li span[class*='selected']");
                $selectedItems.each(function (index, item) {
                    var closestLi = $(item).closest('li');
                    selectArray[index] = {
                        id: closestLi.attr('data-id'),
                        name: closestLi.text(),
                        isradio: closestLi.attr('data-isradio') || "",
                        isendevent: closestLi.attr('data-isendevent') || '',
                        assign: closestLi.attr('data-assign') || '',
                        assignedByGateWay: closestLi.attr('data-assignedByGateWay') || ''
                    };
                });

                //alert(selectArray);
                if (thisObject == "_chart") {
                    _select.showDoActionDiv();//显示审批动作页面
                } else if (submitFun == "getReassignListFun") {
                    _select.showDoActionDiv();//显示审批动作页面
                } else {
                    _alreadySelected.showSelectedDiv();//显示已选择人员页面
                }

                //调用submitFun函数
                eval(thisObject + "." + submitFun + "(selectArray, $clickItem)");
                //退出来
                $("#selectDiv").hide();
            });


            //搜索获取焦点
            /*$("#selectDiv_search").unbind().on('focus', function(){
             //点击搜索框，切换到搜索模块
             //转移选项单选
             if(submitFun == "getReassignListFun"){
             _searchDiv.init('reassign');//单选
             }else{
             _searchDiv.init('');//多选
             }

             });*/

        },
        //显示选择页面
        showSelectDiv: function () {
            //$("#selectDiv").siblings('div').hide();
            $("#alreadySelected").show();
            //大窗口隐藏
            $(".assign_modalOA").hide();
            //显示相应的
            $("#selectDiv").show();
            $("#selectItems_search").val("");
            $("#singleSelectItems_search").val("");
        },

        //取消选择，隐藏选择页面
        showDoActionDiv: function () {
            $("#doActionDiv").siblings('div').hide();
            $("#doActionDiv").show();
        }

    };
    //取消提示模块
    var _cancelAlert = {

        init: function () {
            _cancelAlert.showSelectedDiv();//显示放弃提示页面
            _cancelAlert.eventsBind();//事件绑定
        },

        /**
         * 显示取消提示
         */
        showSelectedDiv: function () {
            //显示提示页面
            $("#cancelSelected").show();
            $("#cancel_alert").show();
        },
        /**
         * 绑定事件
         */
        eventsBind: function () {
            //确定
            $("#calertDiv_submit").unbind().on('click', function () {
                //蒙板
                $("#cancelSelected").hide();
                //小窗口隐藏
                $("#cancel_alert").hide();
                //跳转到详情液面
                //window.location.href = 'OAbillDetail.html?statuskey=' + paramData.statuskey + '&statuscode=' + paramData.statuscode + '&taskid=' + paramData.taskid;
                window.history.back(); // 进入此页面可能是从“消息”单据(OADetail.html)直接进入或者通过“列表”单据(OAbillDetail.html)进入
            });

            //取消
            $("#calertDiv_cancel").unbind().on('click', function () {
                //蒙板
                $("#cancelSelected").hide();
                //小窗口隐藏
                $("#cancel_alert").hide();
            });
        },

    };
    var _chart = {
        /**
         * 报错时提示
         */
        show_error: function (message) {
            var window_height = document.documentElement.clientHeight;
            var _top = (window_height) * 0.33;
            var error_data = $('<div class="error-none" style="padding-top:' + _top + 'px;">'
                + '<table width="100%" border="0" cellspacing="0" cellpadding="0" height="148">'
                + '<tr><td valign="middle" width="100%"><img class="error_img" src="images/error-none.png"/><p>' + message + '</p></td></tr>'
                + '</table>'
                + '</div>');
            $("#pictrue").html("").append(error_data);
            //$(".batch_mode").css("display","none");
        },

        /**
         *初始化
         */
        init: function () {
            _chart.lightAppMultilingual();
            _chart.getDefaultValue();//调用getDefaultValueOfAction接口获取加签和抄送显示初始值
            if (isWeiXin()) {
                _chart.weixinHideShare();//微信禁止分享
            }
            //_chart.initHeightStyle();
            _chart.initBindEvent();
            //_chart.initTaskFlowChart();
//			_chart.initBindEvent();
            //组织整体移动
            //document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
            //$(".select_mode").removeEventListener('touchmove', function (e) { e.preventDefault(); }, false);
            //高度指定
            var _height = $(window).height();
            $("#cc_opinionDiv").height(_height - $("#cc_textarea_title").height() - $("#cc_textarea_content").height() - $("#bottom_submit_div").height());

        },
        /**
         * 多语化公共方法，用法只需要引入相应多语JS后再进行调用即可
         */
        lightAppMultilingual: function () {
            //首先设置title
            var $body = $('body');
            document.title = eval("OAdoActionLang." + paramUser.lang + ".pageTitle");
            // hack在微信等webview中无法修改document.title的情况
            var $iframe = $('<iframe src="/favicon.ico" style="border:none;width:0px;height:0px;"></iframe>');
            $iframe.on('load', function () {
                setTimeout(function () {
                    $iframe.off('load').remove();
                }, 0);
            }).appendTo($body);
            //然后设置页面显示的汉字
            for (var i in eval("OAdoActionLang." + paramUser.lang + ".pageContent")) {
                //i即属性名字ok,close
                console.log("key===" + i + ",value==" + eval("OAdoActionLang." + paramUser.lang + ".pageContent." + i));
                $("." + i).html(eval("OAdoActionLang." + paramUser.lang + ".pageContent." + i));
            }
            //再设置页面中的placeholder中的汉字
            for (var i in eval("OAdoActionLang." + paramUser.lang + ".pagePlaceHoder")) {
                //i即属性名字ok,close
                console.log("placeholder key===" + i + ",value==" + eval("OAdoActionLang." + paramUser.lang + ".pagePlaceHoder." + i));
                $("." + i).attr("placeholder", eval("OAdoActionLang." + paramUser.lang + ".pagePlaceHoder." + i));
            }
        },
        //调用getDefaultValueOfAction接口获取加签和抄送显示初始值
        getDefaultValue: function () {

            $("#loding").show();//显示加载中图标
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getDefaultValueOfAction: {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                    actioncode: paramData.code
                }
            };

            console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    if(typeof result != 'object') {
                        result = eval('(' + result + ')');
                    }
                    console.log("返回数据：" + JSON.stringify(result));
                    try {
                        var defaultValueArray = result.jsonDatas.getDefaultValueOfAction;
                        if (!defaultValueArray || !defaultValueArray.length) {
                            throw({name: '请求失败', message: '初始化数据失败'});
                        }
                        var defaultValue = defaultValueArray[0];

                        //"issend":"Y",//抄送
                        var issend = defaultValue.issend;
                        //"isbassign":"N",//前加签
                        var isbassign = defaultValue.isbassign;
                        //"isaassign":"Y"//后加签
                        var isaassign = defaultValue.isaassign;
                        //初始化页面显示哪些项
                        _chart.initHeightStyle(issend, isbassign, isaassign);
                    } catch (e) {
                        //加载样式处理
                        $("#loding").hide();
                        dialog.log(e.name + ": " + e.message);
                        //dialog.log('getDefaultValueOfAction接口调用失败');
                    }
                    $("#loding").hide();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },
        //微信禁止分享
        weixinHideShare: function () {
            function onBridgeReady() {
                WeixinJSBridge.call('hideOptionMenu');
            }

            if (typeof WeixinJSBridge == "undefined") {
                if (document.addEventListener) {
                    document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
                } else if (document.attachEvent) {
                    document.attachEvent('WeixinJSBridgeReady', onBridgeReady);
                    document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
                }
            } else {
                onBridgeReady();
            }
        },
        /**
         *加载样式
         *issend : "Y/N",//抄送
         *isbassign :"Y/N",//前加签
         *isaassign :"Y/N"//后加签
         */
        initHeightStyle: function (issend, isbassign, isaassign) {
            var _width = $(window).width();
            var _height = $(window).height();
            $("body").width(_width).height(_height);

            //根据动作控制显示内容
            var code = paramData.code;//已阅---doAgreeRead ，同意---doAgree，驳回---doReject，转移---doReassign，前加签---doAddApprove，终止---doTerminal
            var codeName = paramData.codeName;//已阅，同意，驳回，转移，前加签，终止
            var actflag = paramData.actflag;//指派标识

            console.log("code = " + code + "  actflag = " + actflag);

            //批语
            $("#aprovalNote").attr("placeholder", codeName);

            if (clientParam.isapprovecheck == "y") {
                $("#aprovalNote").attr("placeholder", "请输入审批意见");
            }


// vvv1 ;
            //是否需要指派
            if ((actflag == '0') || (actflag == '2')) {
                //alert("显示指派");
                $("#assign").show();
            } else {
                //alert("不显示指派");
                $("#assign").hide();
            }

            //抄送---终止，阅毕，收回不显示抄送
            if (code == "doTerminal" || code == "doAfterRead" || code == "doBack" || issend == "N") {
                //alert("不显示抄送");
                $("#carbonCopy").hide();
            } else {
                $("#carbonCopy").show();
            }

            //驳回
            if (code == "doReject") {
                //alert("显示驳回")
                $("#reject").show();
            } else {
                $("#reject").hide();
            }

            //转移
            if (code == "doReassign") {
                //alert("显示转移")
                $("#reassign").show();
            } else {
                $("#reassign").hide();
            }
            //初始化影藏流程进行方式
            $("#serialORparallel").hide();
            //前加签
            if (code == "doAddApprove") {
                //alert("显示前加签和串并行")
                $("#AddPreApprove").show();
                $("#serialORparallel").show();
            } else {
                $("#AddPreApprove").hide();
            }

            //后加签
            if ((code == "doAgreeRead" || code == "doAgree" || code == "doDisAgree") && isaassign == 'Y') {
                //alert("显示后加签和串并行")
                $("#AddAfterApprove").show();
                $("#serialORparallel").show();
            } else {
                $("#AddAfterApprove").hide();
            }

        },

        /**
         *事件绑定
         */
        initBindEvent: function () {
            //常用语
            $("#getNoteListIcon").unbind().on('click', function () {
                //获取常用语列表
                _chart.getNoteList($(this));
                //
                $("#singleSelectItems_search").attr("placeholder", "审批常用语");

            });


// vvv2 ;
            //指派
            $("#assignIcon").unbind().on('click', function () {
                window.sessionStorage.currentOptCode = "assignIcon";
                //获取指派活动列表
                _chart.getActivityList($(this));
            });


            //手写
            $("#getHandWriteIcon").unbind().on('click', function () {
                /*var url = window.location.href;
                 var urlparam = url.split("?")[1];
                 window.location.href = "OAHandWrite.html?" + urlparam;*/
                _handWrite.init();
            });
            //删除指派选择活动项,添加指派活动对应人员
            $("#assignActivity").unbind().on('click', '.deleteIcon,.addAssignPerson', function () {
                if ($(this).hasClass('deleteIcon')) {
                    // 不可选
                    if( $(this).hasClass('cant_choost') ){
                        return ;
                    }
                    //删除该活动项
                    $(this).closest('li').remove();
                } else if ($(this).hasClass('addAssignPerson')) {
                    //获取对应活动人员
                    var activityid = $(this).closest("li").attr('data-id');
                    //记录当前为指派下的操作
                    window.sessionStorage.currentOptCode = "assignIcon";
                    //保存到session中去
                    window.sessionStorage.activityid = activityid;
                    _chart.getUsersOfActivity(activityid, $(this));
                }

            });


            //抄送
            $("#carbonCopy").unbind().on('click', function () {
                _alreadySelected.init('抄送', paramData.code, "carbonCopy");
            });

            //驳回
            $("#reject").unbind().on('click', function () {
                //清空
                $("#singleSelectItems").html("");
                //获取选择人员列表显示
                $("#alreadySelected").show();
                _alreadySelected.initPersonList(paramData.code, "reject", $(this));
                //_alreadySelected.init('驳回', paramData.code, "reject")

                //驳回搜索框默认值设为人工活动名称
                $("#singleSelectItems_search").attr("placeholder", "人工活动名称");
            });

            //转移
            $("#reassign").unbind().on('click', function () {
                //清空
                $("#singleSelectItems").html("");
                //获取选择人员列表显示
                $("#alreadySelected").show();
                _alreadySelected.initPersonList(paramData.code, "reassign", $(this));
                //_alreadySelected.init('转移', paramData.code, "reassign")

            });

            //前加签
            $("#AddPreApprove").unbind().on('click', function () {
                _alreadySelected.init('前加签', paramData.code, "AddPreApprove");
            });

            //后加签
            $("#AddAfterApprove").unbind().on('click', function () {
                _alreadySelected.init('后加签', paramData.code, "AddAfterApprove");
            });

            //串行或并行点击
            $("#serialORparallel_select span").unbind().on('click', function () {
                $(this).toggleClass('serialORparallel_slected').siblings('span').toggleClass('serialORparallel_slected');
            });

            //取消
            $("#doAction_cancel").unbind().on('click', function () {
                //跳转到详情液面
                //window.location.href = 'OAbillDetail.html?statuskey='+ paramData.statuskey + '&statuscode='+ paramData.statuscode +'&taskid='+ paramData.taskid;
                _cancelAlert.init();
            });

            //提交doAction
            $("#doAction_submit").unbind().on('click', function () {
                //根据后台配置进行必须输入检查
                if (clientParam.isapprovecheck == "y") {
                    if ($("#aprovalNote").val() == "") {
                        dialog.log("批语不能为空,请输入");
                        $("#aprovalNote").focus();
                        return false;
                    }
                }
                //批语
                var approveNote = $("#aprovalNote").val() || $("#aprovalNote").attr("placeholder") || "";

                //指派
                var activityList = [];
                $("#assignActivity li").each(function (index, item) {
                    activityList[index] = {
                        activityid: $(item).attr('data-id'),
                        usrids: [],
                        isendevent: $(item).attr('data-isendevent'),
                        assign: $(item).attr('data-assign'),
                        assignedByGateWay: $(item).attr('data-assignedByGateWay')
                    };
                    $(item).find('.assignPerson span').each(function (i, user) {
                        activityList[index].usrids[i] = $(user).attr('data-id');
                    });
                });

                //抄送
                var carbonCopyList = [];
                $("#carbonCopy_List span").each(function (index, item) {
                    carbonCopyList[index] = $(item).attr('data-id');
                });

                //驳回
                var rejectList = [];
                rejectList[0] = $("#rejectPerson").attr('data-id');
                // rejectList[0] = $("#rejectPerson").text();

                /*$("#reject_List span").each(function(index, item){
                 rejectList[index] = $(item).attr('data-id');
                 });*/

                //转移
                var reassignList = [];
                reassignList[0] = $("#reassignPerson").attr('data-id');

                /*$("#reassign_List span").each(function(index, item){
                 reassignList[index] = $(item).attr('data-id');
                 });*/

                //前加签
                var AddPreApproveList = [];
                $("#AddPreApprove_List span").each(function (index, item) {
                    AddPreApproveList[index] = $(item).attr('data-id');
                });

                //后加签
                var AddAfterApproveList = [];
                $("#AddAfterApprove_List span").each(function (index, item) {
                    AddAfterApproveList[index] = $(item).attr('data-id');
                });

                //串行或并行
                var bsignaltype = "";//1(并行)、2(串行)
                bsignaltype = $("#serialORparallel_select span.serialORparallel_slected").index() + 1;
                //if(paramData.code == "doAgreeRead"||paramData.code == "doAgree"){
                //	bsignaltype = $("#serialORparallel_select span.serialORparallel_slected").index()+1;
                //}

                //校验
                _chart.validateDate(approveNote, activityList, carbonCopyList, rejectList, reassignList, AddPreApproveList, AddAfterApproveList, bsignaltype);

            });


        },

// vvv6 ;
        /**
         * 提交前校验数据是否为空
         */
        validateDate: function (approveNote, activityList, carbonCopyList, rejectList, reassignList, AddPreApproveList, AddAfterApproveList, bsignaltype) {

        // 存在后加签
            if( $("#AddAfterApprove").css('display') == 'block' ){
                // 存在后加签但是没有选人
                if( AddAfterApproveList.length==0 ){
                    //指派
                    if ($("#assign")[0].style.display != "none") {
                        if (activityList.length == 0) {
                            dialog.log("请后加签或指派");
                            return false;
                        }

                        for(var i = 0, len=activityList.length; i < len; i++) {
                            var item = activityList[i],
                                isendevent = item.isendevent,
                                assign = item.assign,
                                assignedByGateWay = item.assignedByGateWay ;

                            if( assign=='undefined'&&assignedByGateWay=='undefined' ){ 
                                // 用户等于0 ;
                                if( item.usrids.length == 0 ){
                                    if( /^Y$/i.test(isendevent) ){
                                        // 是结束节点
                                    }else{
                                        // 不是结束节点
                                        dialog.log("请后加签或指派");return false ;
                                    }
                                }
                            }else{
                                // *** 人工节点选择 (有上一步指派) && 不是 结束节点 ;
                                if( /^Y$/i.test(assign) && /^Y$/i.test(isendevent)==false ){
                                    if(item.usrids.length==0){ dialog.log("请后加签或指派"); return false} ;
                                }
                            }

                        } //for over ;
                    }                    
                }
            }
        // 不存在后加签
            else{
                //指派
                if ($("#assign")[0].style.display != "none") {
                    if (activityList.length == 0) {
                        dialog.log("指派活动不能为空,请选择");
                        return false;
                    }

                    for(var i = 0, len=activityList.length; i < len; i++) {
                        var item = activityList[i],
                            isendevent = item.isendevent,
                            assign = item.assign,
                            assignedByGateWay = item.assignedByGateWay ;

                        if( assign=='undefined'&&assignedByGateWay=='undefined' ){ 
                            // 用户等于0 ;
                            if( item.usrids.length == 0 ){
                                if( /^Y$/i.test(isendevent) ){
                                    // 是结束节点
                                }else{
                                    // 不是结束节点
                                    dialog.log("指派人员不能为空,请选择");return false ;
                                }
                            }
                        }else{
                            // *** 人工节点选择 (有上一步指派) && 不是 结束节点 ;
                            if( /^Y$/i.test(assign) && /^Y$/i.test(isendevent)==false ){
                                if(item.usrids.length==0){ dialog.log("存在节点没有选择指派人"); return false} ;
                            }
                        }

                    } //for over ;
                }
            }


            //驳回
            if ($("#reject")[0].style.display != "none" && $("#rejectPerson").text() == "") {
                // 驳回按钮出现 && 没选驳回人 
                dialog.log("驳回人员不能为空,请选择");
                return false;
            }

            //转移
            if ($("#reassign")[0].style.display != "none" && $("#reassignPerson").text() == "") {
                dialog.log("转移人员不能为空,请选择");
                return false;
            }

            //前加签
            if ($("#AddPreApprove")[0].style.display != "none" && $("#AddPreApprove_Sum").text() == "0") {
                dialog.log("前加签人员不能为空,请选择");
                return false;
            }

            /*
            $.ajax({
                type: "GET",
                url: contextPath() + "/checkfee/checkIsFee?domain=" + paramUser.domain + "&appkey=" + paramUser.appkey + "&ucode=" + paramUser.ucode + "&t=" + new Date().getTime(),
                dataType: "json",
                contentType: "application/json",
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                    XMLHttpRequest.setRequestHeader("userid", paramUser.userid);
                    XMLHttpRequest.setRequestHeader("username", paramUser.username);
                },
                success: function (result) {
                    result = eval('(' + result + ')');
                    if (result.code == "1") {
                        if(result.desc == ""){
                            dialog.log(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.noFeeInfo") + result.desc );//"移动审批已欠费，请联系管理员"
                        }else{
                            dialog.log(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.noFeeInfo") + "("+result.desc+")" );//"移动审批已欠费，请联系管理员"
                        }
                        $("#loding").hide();//隐藏加载中图标
                        return false;
                    }

                    //执行审批动作
                    //调用doAction方法
                    if(window.AllowDoActionFun){
                        window.AllowDoActionFun=false;
                        _chart.doActionFun(paramData.code, approveNote, activityList, carbonCopyList, rejectList, reassignList, AddPreApproveList, AddAfterApproveList, bsignaltype);
                    }
                    // _chart.doActionFun(paramData.code, approveNote, activityList, carbonCopyList, rejectList, reassignList, AddPreApproveList, AddAfterApproveList, bsignaltype);
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#loding").hide();//显示加载中图标
                    dialog.log(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.networkfailedInfo"));//"网络连接失败，请您检查网络后重试"
                }
            });
            */
            //执行审批动作
            //调用doAction方法
            if(window.AllowDoActionFun){
                window.AllowDoActionFun=false;
                _chart.doActionFun(paramData.code, approveNote, activityList, carbonCopyList, rejectList, reassignList, AddPreApproveList, AddAfterApproveList, bsignaltype);
            }
        },
        /**
         * 获取常用语列表
         */
        getNoteList: function ($this) {
            $("#loding").show();//显示加载中图标
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getNoteList: {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                    actioncode: paramData.code
                }
            };

            console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    if(typeof result != 'object') {
                        result = eval('(' + result + ')');
                    }
                    console.log("返回数据：" + JSON.stringify(result));
                    try {
                        var list = result.jsonDatas.getNoteList[0].list;
                        if (!list) {
                            throw({name: '请求失败', message: '获取常用语列表失败'});
                        }
                        var activityList = [];
                        for (var i = 0; i < list.length; i++) {
                            activityList[i] = {};
                            activityList[i].name = list[i].opinion;
                        }

                        _singleSelect.init("_chart", activityList, "getNoteListFun", $this);

                        //加载样式处理
                        $("#loding").hide();
                    } catch (e) {
                        //加载样式处理
                        $("#loding").hide();
                        dialog.log(e.name + ": " + e.message);
                    }
                    $("#loding").hide();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },
        /**
         * 获取常用语后
         */
        getNoteListFun: function (selectItem, $thisItem) {
            $("#aprovalNote").text(selectItem.name).attr('data-id', selectItem.id);
        },


// vvv3 ;
        /**
         * 获取指派活动列表
         */
        getActivityList: function ($this) {
            $("#loding").show();//显示加载中图标
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getActivityList: {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                    actioncode: paramData.code,
                    startline: "1",
                    count: "999"
                }
            };

            console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    if(typeof result != 'object') {
                        result = eval('(' + result + ')');
                    }
                    console.log("返回数据：" + JSON.stringify(result));
                    try {
                        var getActivityList  = result.jsonDatas.getActivityList[0],
                            activityList = getActivityList.list;
                        if (!activityList || !activityList.length) {
                            throw({name: '请求失败', message: '获取活动列表失败'});
                        }

                    // ** 只有一条 返回数据 
                        if( activityList.length==1 && !(/^[Yy]$/.test(activityList[0].isendevent)) ){ 
                            if( activityList[0].assign!=undefined && activityList[0].assignedByGateWay!=undefined ){
                             //老窖的
                                $this.attr('data-isradio', getActivityList.isradio);        // 活动列表是否可以多选
                                _select.init("_chart", activityList, "ActivityListFun", $this);
                                //加载样式处理
                                $("#loding").hide();
                            }else{
                             //正常的
                               // 只有1个部门分组，且不是“结束” ;
                                var selectArray = [],
                                    $clickItem,
                                    code = activityList[0].code;
                                window.sessionStorage.activityid = code; // 保存部门code值
                                selectArray.push(activityList[0]);
                                _chart.ActivityListFun(selectArray);
                                $clickItem = $('#assignActivity li[data-id="' + code + '"]').find('a.addAssignPerson');
                                $clickItem.attr('data-isradio', activityList[0].isradio);
                                _chart.getUsersOfActivity(code, $clickItem);
                            }
                        } 
                    // ** 多条 返回数据
                        else {
                            $this.attr('data-isradio', getActivityList.isradio);        // 活动列表是否可以多选
                            _select.init("_chart", activityList, "ActivityListFun", $this);
                            //加载样式处理
                            $("#loding").hide();
                        }
                    } catch (e) {
                        //加载样式处理
                        $("#loding").hide();
                        dialog.log(e.name + ": " + e.message);
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },

// vvv5 
        /**
         * 选择完活动项目点击提交函数
         */
        ActivityListFun: function (selectArray, $clickItem) {

            var assignActivitys = "";
            //遍历selectArray
            for (var i = 0, len=selectArray.length; i<len; i++) {
                //将选择活动加入指派列表
                var item = selectArray[i],
                    id = item.id,
                    name = item.name,
                    isendevent = item.isendevent,
                    assign = item.assign,
                    assignedByGateWay = item.assignedByGateWay,
                    isradio = item.isradio; // 指派人员单选

                    var assignStyle = 'none' ;
                // *** 人工节点勾选( 由上一步指派 ) ;
                    if( assign!='undefined' && /^Y$/i.test(assign) ){
                        assignStyle = 'block' ;
                    }
                    // 特殊处理 ;
                    if( assign=='undefined' && assignedByGateWay=='undefined'){
                        assignStyle='block' ;
                    }
                // *** 结束活动 不需要指派
                    if( isendevent!='undefined' && /^Y$/i.test(isendevent) ){
                        assignStyle = 'none' ;
                    }

                assignActivitys += "<li data-id=" + id + " data-assign=" + assign + " data-assignedByGateWay=" + assignedByGateWay + " data-isendevent= " + isendevent +">"
                    + "<div class='cc_a'><span class='cc_a_radius deleteIcon'>一</span>" + name + "</div>"
                    + "<div class='assignPerson'></div>"
                    + "<a href='#' style='" + 'display:' + assignStyle + "' class='cc_people_add addAssignPerson' data-isradio='" + isradio + "'></a>"
                    + "</li>" ;
            }
            $("#assignActivity").html('').append(assignActivitys);

            // kkk2 
            // *** 如果菱形勾选( 指派下一步 ) ; 默认的被选中 切不能更改 ;;; 
            $.each($("#assignActivity").find('li') , function(k,v){
                var pd = $(v).attr('data-assignedByGateWay');
                
                if(pd=='undefined'){return};

                if( /^Y$/i.test(pd)==false ){
                    $(v).find('.cc_a span').addClass('cant_choost')
                }
            })


        },






        /**
         * 获取活动对应指派人员
         */
        getUsersOfActivity: function (activityid, $this) {
            $("#loding").show();//显示加载中图标
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                getUsersOfActivity: {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                    actioncode: paramData.code,
                    activityid: activityid,
                    condition: "",
                    startline: "1",
                    count: "999"
                }
            };


            console.log("传入参数：" + JSON.stringify(param));
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    if(typeof result != 'object') {
                        result = eval('(' + result + ')');
                    }
                    console.log("返回数据：" + JSON.stringify(result));
                    try {
                        var personList = result.jsonDatas.getUsersOfActivity[0].list;
                        if (!personList || !personList.length) {
                            throw({name: '请求失败', message: '获取指派人列表失败'});
                        }
                        _select.init("_chart", personList, "UsersOfActivityListFun", $this);

                        //加载样式处理
                        $("#loding").hide();
                    } catch (e) {
                        //加载样式处理
                        $("#loding").hide();
                        dialog.log(e.name + ": " + e.message);
                    }
                    $("#loding").hide();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },

        /**
         * 选择完活动项目点击提交函数
         */
        UsersOfActivityListFun: function (selectArray, $clickItem) {
            var assignUsers = "";
            //遍历selectArray
            for (var i = 0; i < selectArray.length; i++) {
                //将选择活动加入指派列表
                assignUsers += "<span class='cc_people' data-id='" + selectArray[i].id + "'>" + selectArray[i].name + "</span>";

            }
            $clickItem.siblings(".assignPerson").html('').append(assignUsers);
        },
        //执行审批动作
        doActionFun: function (code, note, activityList, carbonCopyList, rejectList, reassignList, AddPreApproveList, AddAfterApproveList, bsignaltype) {

            //指派列表为空时，指派数组为null,否则对后加签操作有影响
            if (activityList.length == 0) {
                activityList = null;
            }
            //取得页面传递过来的手写签名的base64加密串
            var handWriteData = window.sessionStorage.handWriteData;
            var param = {
                serviceid: "oa_sp63_ispservice",
                token: paramUser.oatoken,
                usercode: paramUser.ucode,
                doAction: {
                    groupid: paramUser.groupid,
                    userid: paramUser.userid,
                    actiondes: [{
                        statuscode: paramData.statuscode,
                        statuskey: paramData.statuskey,
                        taskid: paramData.taskid,
                        actioncode: code,
                        note: note + "---(来自移动端)",
                        activityids: activityList,//指派
                        ccusers: carbonCopyList,//抄送
                        rejectmarks: rejectList,//驳回
                        userids: reassignList,//转移
                        bsignalusers: AddPreApproveList,//前加签
                        asignalusers: AddAfterApproveList,//后加签
                        bsignaltype: bsignaltype.toString(),//串行或并行，1(并行)、2(串行)
                        asignaltype: bsignaltype.toString(),//串行或并行，1(并行)、2(串行)
                        postil: handWriteData == undefined ? "" : handWriteData
                    }]
                }
            };

            console.log("doAvtion传入参数：" + JSON.stringify(param));

            var url = contextPath() + "/umapp/approve?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                    XMLHttpRequest.setRequestHeader("domain", paramUser.domain);
                    XMLHttpRequest.setRequestHeader("client", paramUser.client);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {

                    window.AllowDoActionFun=true;

                    if(typeof result != 'object') {
                        result = eval('(' + result + ')');
                    }
                    console.log("返回JSON数据串为：" + JSON.stringify(result));
                    if (result.code != "0") {
                        dialog.log(result.desc);
                        console.log(result.desc);
                    } else {

                        var flag = result.jsonDatas.doAction[0].flag;
                        var des = result.jsonDatas.doAction[0].des;
                        if (flag == "1") {
                            dialog.log(des);
                        } else {
                            $("#assign").hide();
                            //dialog.log("单据详情信息加载失败");
                            dialog.log('操作成功', function () {
                                // 存在callbackurl 跳转
                                var url = paramData['callbackurl']; 
                                if( url ){
                                    url = decodeURIComponent(url);
                                    window.location.href = url ;
                                    return ;
                                };

                                if( paramData['fromOADetail'] ){
                                    // 消息进来友空间关闭当前webview
                                    try {
                                        YKJ_CLOSE_WEBVIEW(function(YonYouJSBridge){
                                            var data = {'function': 'closePage'} ;
                                                YonYouJSBridge.send(JSON.stringify(data), function(responseData){});
                                        });
                                    } catch(e){};
                                }else{
                                    var urlparam = window.sessionStorage.urlparam;
                                    window.location.href = "billList.html?" + urlparam;
                                }
                            }, 2000);
                        }

                    }
                    //转圈去除
                    $("#loding").hide();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {

                    window.AllowDoActionFun=true;

                    console.log('执行函数失败');
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },
        /**
         *加载数据
         */
        initTaskFlowChart: function () {
            var param = {
                serviceid: "sp63_fileservice",
                token: paramUser.token,
                usercode: paramUser.ucode,
                getTaskFlowChart: {
                    groupid: paramUser.groupid,
                    usrid: paramUser.userid,
                    taskid: paramData.taskid,
                    statuscode: paramData.statuscode,
                    statuskey: paramData.statuskey,
                    picid: "",
                    width: "100",
                    height: "100"
                }
            };
            var url = contextPath() + "/umapp/reqdata?radom=" + Math.random();
            $.ajax({
                type: "post",
                url: url,
                //async : true,
                data: JSON.stringify(param),
                beforeSend: function (XMLHttpRequest) {
                    XMLHttpRequest.setRequestHeader("maurl", paramUser.maurl);
                },
                contentType: 'application/json;charset=utf-8',
                success: function (result) {
                    if(typeof result != 'object') {
                        result = eval('(' + result + ')');
                    }
//				    	console.log(JSON.stringify(result));
                    if (result == "" || typeof(result) == "undefined") {
                        console.log("流程图加载失败");
                        //dialog.log(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.flowCharfailedLoad"));//"流程图加载失败"
                        _chart.show_error(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.flowCharfailedLoad"));//"流程图加载失败"
                        $("#loding").hide();
                    } else {

                        if (result.code != "0") {
                            console.log(result.desc);
                            //dialog.log(result.desc);
                            _chart.show_error(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.flowCharfailedLoad"));//"流程图加载失败"
                            $("#loding").hide();
                        } else {
                            var jsonData = result.jsonDatas.getTaskFlowChart[0];
                            if ((!jsonData) || jsonData.flag == '1') {
                                if (jsonData.desc == undefined) {
                                    _chart.show_error(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.flowCharfailedLoad"));//"流程图加载失败"
                                } else {
                                    _chart.show_error(jsonData.desc);
                                }
                                $("#loding").hide();
                            } else {
                                var _img = result.jsonDatas.getTaskFlowChart[0].pic;
                                var _picture = $('<div id="charFlow_picture"><img src=data:image/png;base64,' + _img + ' id="imgload" style="display:block;" /></div>');
                                $("#pictrue").append(_picture);

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


                                document.getElementById("imgload").onload = function () {
                                    //图片加载完成，居中
                                    var window_height = $(document).height();//浏览器当前文档的高度
                                    var img_height = $('#charFlow_picture').height();
                                    var padValue = (window_height - img_height) / 2;
                                    //alert(window_height  + '  ' + img_height  + '  ' + padValue);
                                    //iscroll缩放滑动
                                    $('#charFlow_picture').css('padding-top', padValue + 'px').css('padding-bottom', padValue + 'px');
                                    if (padValue < 30) {
                                        $('#charFlow_picture').css('padding-bottom', '30px');
                                    }

                                    if (typeof(_iscroll) != "undefined") {
                                        _iscroll.destroy();
                                    }
                                    _iscroll = new iScroll('pictrue', {
                                        scrollbarClass: 'myScrollbar',
                                        checkDOMChanges: true,
                                        zoom: true,
                                        scrollX: true,
                                        scrollY: true,
                                        mouseWheel: true,
                                        wheelAction: 'zoom',
                                        zoomMax: 4
                                    });
                                };
                                $("#loding").hide();
                            }

                        }
                    }
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    _chart.show_error(eval("OAdoActionLang." + paramUser.lang + ".pageMessage.Error"));//"调用接口失败"
                    //加载样式处理
                    $("#loding").hide();
                }
            });
        },

        stripscript: function (str) {
            var pattern = /^[\w\u4e00-\u9fa5]+$/gi;
            if (pattern.test(str)) {
                // console.log("false");
                return false;
            }
            // console.log("true");
            return true;
        }
    };
    return _chart;
});

/**
 * 解析URL攜帶的?之後的參數，轉換為對象，返回之
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
 * 获取URL的contextPath
 * @returns
 */
var contextPath = function () {
     var origin = window.location.protocol + '//' + window.location.host;
    var pathname = location.pathname;
	//var projectname = pathname.substr(0, pathname.indexOf('/', 1));
	var projectname = pathname.substr(0, pathname.indexOf('/', 0));
    return origin + projectname;
};
/**
 * 根据搜索框内容，过滤人员列表
 */
var searchUserList = function (obj) {
    var value = $(obj).val();
    var userListId = $(obj).attr("id").split("_")[0];

    var $userList = $('#' + userListId).find('li');//获取人员列表
    //$userList.closest('.contact_person').css('display', 'block');

    $userList.each(function (index, elem) {
        $(this).css('display', 'block');
        //循环过滤
        if ($(this).text().indexOf(value) == -1 && $(this).attr("data-code").indexOf(value) == -1) {//含有该搜索字符串
            $(this).css('display', 'none');
        }
    });
};

// 友空间打开关闭当前webview ;
function YKJ_CLOSE_WEBVIEW(callback){
    if (window.WebViewJavascriptBridge){
        callback(WebViewJavascriptBridge);
    } else {
        document.addEventListener('WebViewJavascriptBridgeReady', function(){
            callback(WebViewJavascriptBridge);
        }, false);
    }
}














