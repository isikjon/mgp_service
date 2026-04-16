$(document).ready(function () {
    
    $('body')
    .on('click', '[data-toggle-search]', function() {
        $('.search-panel-container').toggleClass('search-panel-container_close search-panel-container_open');
        $('.search-panel-container_open').find('.input-search__input').trigger( "focus" );
    });
    
    var $sidebarCatalog = $('.custom-sidebar-catalog');
    
    $sidebarCatalog.on('click', '.catalog-list__item_has-children', function (e) {
        e.preventDefault();
        
        var category_id =  $(this).data('category_id');
        var $category = $sidebarCatalog.find('.catalog-extend__columns').filter(function () {
            return $(this).data('category_id') === category_id;
        });

        $(this).toggleClass('custom_item_active').siblings().removeClass('custom_item_active');
        $category.toggleClass('custom_item_category_active').siblings().removeClass('custom_item_category_active');
        
        if ( $(this).hasClass('custom_item_active') ) {
            $sidebarCatalog.addClass('custom-sidebar-catalog_open');
        } else {
            $sidebarCatalog.removeClass('custom-sidebar-catalog_open');
        }
        
        return false;
    });
    $(document).on('click', function(event) {
        if (!$(event.target).parents().hasClass('custom-sidebar-catalog')) {
            $sidebarCatalog.removeClass('custom-sidebar-catalog_open');
            $sidebarCatalog.find('.catalog-list__item').removeClass('custom_item_active');
            $sidebarCatalog.find('.catalog-extend__columns').removeClass('custom_item_category_active');
        }
    });
    
});