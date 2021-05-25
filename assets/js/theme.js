// Custome theme code

if ($('.clean-gallery').length > 0) {
   baguetteBox.run('.clean-gallery', { animation: 'slideIn'});
}

if ($('.clean-product').length > 0) {
    $(window).on("load",function() {
        $('.sp-wrap').smoothproducts();
    });
}

/* this part to init AOS and smoothScroll functions */
$(function() {  /* this is the jQuery equivalent of documents.ready */
    AOS.init({
      disable: 'mobile'
    });
   smoothScroll.init();
});


