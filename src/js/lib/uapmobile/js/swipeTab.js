/* 滑动菜单 */ 
+ function($) {
  'use strict';
  $(function() {
    /* swipe tab bar */
    var tabbar = $('[data-action="swipeTab"]');
    $.each(tabbar, function(i, e) {
      var bar = $(this).find("li");
      var targetName = tabbar.eq(i).data("target");
      var target = document.getElementById(targetName);
      window["swipe" + i] = Swipe(target, {
        // startSlide: 4,
        // auto: 3000,
        // continuous: true,
        // disableScroll: true,
        // stopPropagation: true,
        //transitionEnd: function(index, element) {},
        callback: function(index, element) {
          //bar.removeClass("active").eq(index).addClass("active");
        }
      });
      bar.on("click", function() {
        var e = $(this).index();
        $(this).addClass('active').siblings().removeClass('active');
        window["swipe" + i].slide(e, 200);
      });
    });
  });
}(jQuery);