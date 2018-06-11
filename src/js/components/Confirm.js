/**
 * Created by lwz on 2017/01/13.
 * @description 确认对话框组件
 */
define(['zepto', 'util/utils'], function($, utils) {
    /**
     * @description 确认对话框类
     * @param {string} title 确认对话框标题
     * @param {string} des 确认对话框描述
     * @param {function} successCb 确认对话框确认按钮点击的回调函数
     * @param {function} failureCb 确认对话框取消按钮点击的回调函数
     * @returns {Confirm}
     * @constructor
     */
    function Confirm(title, des, successCb, failureCb) {
        if(this instanceof  Confirm) {
            this.title = title;
            this.des = des;
            this.successCb = successCb;
            this.failureCb = failureCb;
        } else {
            return new Confirm(title, des, successCb, failureCb);
        }
    }

    /**
     * @description 构造用户信息弹出框的界面
     * @returns {*|jQuery|HTMLElement} 用户信息弹出框的jQuery表示
     */
    Confirm.prototype.getView = function() {
        var html = '\
			<div class="mask" id="confirm" style="display:none;">\n\
				<div class="popup">\n\
                    <table class="col-2-8">\n\
                        <caption>' + this.title + '</caption>\n\
                        <tfoot>\n\
                            <tr>\n\
                                <td class="cancelBtn" style="width: 50%; border-right:1px solid #eee;">取消</td>\n\
                                <td class="confirmBtn" style="width: 50%;">确认</td>\n\
                            </tr>\n\
                        </tfoot>\n\
                        <tbody class="confirmTips">\n\
                            <tr>\n\
                                <td colspan="2">' + this.des + '</td>\n\
                            </tr>\n\
                        </tbody>\n\
                    </table>\n\
				</div>\n\
			</div>';
        return $(html);
    };

    /**
     * @description 显示用户信息弹出框
     */
    Confirm.prototype.show = function() {
        //this.getView();
        var confirm = this.getView();
        if(!document.getElementById('confirm')) {
            $('body').append(confirm);
        } else {
            $('#confirm').replaceWith(confirm);
        }
        $('#confirm').show();
        this.bindEvent();
    };

    /**
     * @description
     * @param type
     */
    Confirm.prototype.invokeCb = function(type) {
        $('#confirm').hide();
        switch (type) {
            case 0:         // 取消
                if(typeof this.failureCb === 'function') {
                    this.failureCb();
                }
                break;
            case 1:         // 确认
                if(typeof this.successCb === 'function') {
                    this.successCb();
                }
                break;
            default:
                break;
        }

    };

    /**
     * @description 用户信息弹出框取消按钮的绑定事件
     */
    Confirm.prototype.bindEvent = function () {
        var that = this;
        $('#confirm .cancelBtn').unbind().on('click', function(event) {
            that.invokeCb(0);
        });
        $('#confirm .confirmBtn').unbind().on('click', function (event) {
            that.invokeCb(1);
        });
    };

    return Confirm;
});