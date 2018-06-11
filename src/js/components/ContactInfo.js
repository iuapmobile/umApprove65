/**
 * Created by lwz on 2016/11/29.
 * @description 用户信息弹出框组件
 */
define(['zepto', 'util/utils'], function($, utils) {
    /**
     * @description 用户信息弹出框类
     * @param {object} contactInfo 用户信息数据
     * @param {function} callback 用户信息弹出框隐藏时的回调函数，可用于清理工作
     * @returns {ContactInfo}
     * @constructor
     */
    function ContactInfo(contactInfo, callback) {
        if(this instanceof  ContactInfo) {
            this.contactInfo = contactInfo;
            this.callback = callback;
        } else {
            return new ContactInfo(contactInfo, callback);
        }
    }

    /**
     * @description 构造用户信息弹出框的界面
     * @returns {*|jQuery|HTMLElement} 用户信息弹出框的jQuery表示
     */
    ContactInfo.prototype.getView = function() {
        var html = '\
			<div class="mask" id="contactInfo" style="display:none;">\n\
				<div class="popup">\n\
                    <table class="col-2-8">\n\
                        <caption>人员信息</caption>\n\
                        <tfoot>\n\
                            <tr><td colspan="2">取消</td></tr>\n\
                        </tfoot>\n\
                        <tbody>\n\
                            <tr>\n\
                                <td>姓名</td>\n\
                                <td>' + this.contactInfo.pname + '</td>\n\
                            </tr>\n\
                            <tr>\n\
                                <td>部门</td>\n\
                                <td>' + this.contactInfo.pdes + '</td>\n\
                            </tr>\n\
                        </tbody>\n\
                    </table>\n\
				</div>\n\
			</div>';

        var contactinfolist = this.contactInfo.contactinfolist,
            contactInfoComp = $(html),
            i = 0,
            len = 0,
            propnameShow = "";
        if(contactinfolist && contactinfolist.length) {
            for(len=contactinfolist.length; i<len; i++) {
                var item = contactinfolist[i],
                    propvalue = item.propvalue;
                //判断是电话还是邮件属性
                if (propvalue.indexOf("@") >= 0) {
                    propnameShow += '<tr><td>' + item.propname + '</td><td><a href="mailto:' + propvalue + '">' + propvalue + '</a></td></tr>';
                    //propnameShow = '<li class="number" style="width:80%;"><span><a href="mailto:' + contactinfolist[i].propvalue + '">' + contactinfolist[i].propvalue + '</a></span></li>'
                } else {
                    //电话
                    //propnameShow = '<li class="number"><span><a href="tel:' + contactinfolist[i].propvalue + '">' + contactinfolist[i].propvalue + '</a></span></li>';
                    if(!utils.isWeiXin()) {
                        propnameShow += '<tr><td>' + item.propname + '</td><td><a href="tel:' + propvalue + '">' + propvalue + '</a></td></tr>';
                        //propnameShow += '<tr><td>' + item.propname + '</td><td><a href="tel:'+propvalue+'">'+propvalue+'</a></span><a href="tel:'+propvalue+'" class="inline_button tel_call"></a><a href="sms://'+propvalue+'" class="inline_button sms_call"></a></td></tr>';
                    } else {
                        if(/^1[3|4|5|7|8]\d{9}$/.test(propvalue)) { //手机，显示发短信和打电话
                            propnameShow += '<tr><td>' + item.propname + '</td><td><a href="tel:'+propvalue+'">'+propvalue+'</a></span><a href="tel:'+propvalue+'" class="inline_button tel_call"></a><a href="sms://'+propvalue+'" class="inline_button sms_call"></a></td></tr>';
                            //propnameShow += '<tr><td>' + item.propname + '</td><td><a href="tel:' + propvalue + '">' + propvalue + '</a></td></tr>';
                            //propnameShow = '<li class="number" style="width:80%;"><span><a href="tel:'+contactinfolist[i].propvalue+'">'+contactinfolist[i].propvalue+'</a></span><a href="tel:'+contactinfolist[i].propvalue+'" class="inline_button tel_call"></a><a href="sms://'+contactinfolist[i].propvalue+'" class="inline_button sms_call"></a></li>';
                        } else if(/^(\(\d{3,4}\)|\d{3,4}-|\s)?\d{7,14}$/.test(contactinfolist[i].propvalue)) { //固话，只显示打电话
                            propnameShow += '<tr><td>' + item.propname + '</td><td><a href="tel:' + propvalue + '">' + propvalue + '</a></td></tr>';
                            //propnameShow = '<li class="number" style="width:80%;"><span><a href="tel:'+contactinfolist[i].propvalue+'">'+contactinfolist[i].propvalue+'</a></span><a href="tel:'+contactinfolist[i].propvalue+'" class="tel_call"></a></li>';
                        }
                    }
                }
            }
            // 修改bug 
            // contactInfoComp.find('tbody').append($(propnameShow));
            contactInfoComp.find('tbody').append(propnameShow);
        }
        return contactInfoComp;
    };

    /**
     * @description 显示用户信息弹出框
     */
    ContactInfo.prototype.show = function() {
        //this.getView();
        var contactInfo = this.getView();
        if(!document.getElementById('contactInfo')) {
            $('body').append(contactInfo);
        } else {
            $('#contactInfo').replaceWith(contactInfo);
        }
        $('#contactInfo').show();
        this.bindEvent();
    };

    /**
     * @description 隐藏用户信息弹出框
     */
    ContactInfo.prototype.hide = function() {
        $('#contactInfo').hide();
        if(typeof this.callback === 'function') {
            this.callback();
        }
    };

    /**
     * @description 用户信息弹出框取消按钮的绑定事件
     */
    ContactInfo.prototype.bindEvent = function () {
        var that = this;
        $('#contactInfo tfoot').unbind().on('click', function(event) {
            that.hide();
        });
    };

    return ContactInfo;
});