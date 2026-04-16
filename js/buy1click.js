(function ($) {
    $(function () {
        let config = window.shop_buy1click_config;

        var Button = function ($button) {
            var self = {
                init: function () {
                    $button.addClass('buy1click-open-button_init');

                    $button.on('click', function () {
                        self.fetchForm();
                    });

                    var $form = self.getForm();

                    if ($form) {
                        $($form.get(0).elements).on('change', function () {
                            self.updateDisabled();
                        });
                    }

                    self.updateDisabled();
                },
                isInit: function () {
                    return $button.hasClass('buy1click-open-button_init');
                },
                getType: function () {
                    return $button.data('type');
                },
                getForm: function () {
                    if (self.getType() != 'item') {
                        return null;
                    }

                    var $form = $($button.get(0).form);

                    if ($form.length !== 0) {
                        return $form;
                    }

                    $form = $();

                    $('input[name="product_id"]').each(function () {
                        if ($(this).val() != $button.data('product_id')) {
                            return;
                        }

                        $form = $form.add($(this.form));

                        return false;
                    });

                    if ($form.length === 1) {
                        return $form;
                    }

                    return null;
                },
                getFormProperty: function (property) {
                    var $form = self.getForm();

                    if ($form == null) {
                        return null;
                    }

                    var element_property = $form.get(0).elements[property];

                    if (!element_property) {
                        return null;
                    }

                    if (Object.prototype.isPrototypeOf.call(HTMLCollection.prototype, element_property)) {
                        return $(element_property).filter(':checked').val();
                    } else {
                        return element_property.value;
                    }
                },
                getSkuID: function () {
                    if (self.getType() != 'item') {
                        return null;
                    }

                    var sku_id = self.getFormProperty('sku_id');

                    if (sku_id) {
                        return sku_id;
                    }

                    sku_id = $button.data('sku_id');

                    if (sku_id) {
                        return sku_id;
                    }

                    return $button.data('default_sku_id');
                },
                getProductID: function () {
                    if (self.getType() != 'item') {
                        return null;
                    }

                    var product_id = self.getFormProperty('product_id');

                    if (product_id) {
                        return product_id;
                    }

                    product_id = $button.data('product_id');

                    if (product_id) {
                        return product_id;
                    }

                    return null;
                },
                getQuantity: function () {
                    if (self.getType() != 'item') {
                        return null;
                    }

                    var quantity = $button.data('quantity');

                    if (quantity) {
                        return quantity;
                    }

                    quantity = self.getFormProperty('quantity');

                    if (quantity) {
                        return quantity;
                    }

                    return 1;
                },
                getFeatures: function () {
                    var $form = self.getForm();

                    if ($form == null) {
                        return null;
                    }

                    var nameRegexp = /^features\[(\d+)]$/;
                    var features = [];
                    var elements = $form.first().serializeArray();

                    for (var i = 0; i < elements.length; i++) {
                        var element = elements[i];
                        var matches = nameRegexp.exec(element.name);

                        if (!matches) {
                            continue;
                        }

                        var feature_id = matches[1];
                        var feature_value_id = element.value;
                        features.push({
                            feature_id: feature_id,
                            feature_value_id: feature_value_id
                        });
                    }

                    if (features.length == 0) {
                        return null;
                    }

                    return features;
                },
                getServices: function () {
                    var $form = self.getForm();

                    if ($form == null) {
                        return null;
                    }

                    var service_ids = $($form.get(0).elements['services[]']);

                    if (!service_ids.length) {
                        return [];
                    }

                    var services = [];

                    service_ids.each(function () {
                        if (!this.checked) {
                            return;
                        }

                        var service_id = this.value;
                        var service_variant_id = $($form.get(0).elements['service_variant[' + service_id + ']']).val();
                        services.push({
                            service_id: service_id,
                            service_variant_id: service_variant_id
                        });
                    });

                    return services;
                },
                isDisabled: function () {
                    var is_loading = $button.data('is_loading');

                    if (is_loading) {
                        return true;
                    }

                    var sku_available = $button.data('sku_available');

                    if (!sku_available) {
                        return false;
                    }

                    var features = self.getFeatures();
                    var sku_id = self.getSkuID();
                    var key = null;

                    if (features) {
                        key = features.map(function (feature) {
                            return feature.feature_id + ':' + feature.feature_value_id + ';';
                        }).join('');
                    } else if (sku_id) {
                        key = sku_id;
                    }

                    if (key) {
                        return !sku_available[key];
                    }

                    return true;
                },
                loading: function () {
                    $button.data('is_loading', true);
                    $button.addClass('buy1click-open-button_loading');
                    self.updateDisabled();
                },
                loadingEnd: function () {
                    $button.data('is_loading', false);
                    $button.removeClass('buy1click-open-button_loading');
                    self.updateDisabled();
                },
                updateDisabled: function () {
                    $button.prop('disabled', self.isDisabled());
                },
                fetchForm: function () {
                    self.loading();

                    var promise = null;

                    if (self.getType() == 'item') {
                        var sku_id = self.getSkuID();
                        var features = self.getFeatures();
                        var product_id = self.getProductID();

                        if (features) {
                            promise = FormStorage.fetchByItemFeatures(
                                product_id,
                                features,
                                self.getServices(),
                                self.getQuantity()
                            );
                        } else if (sku_id) {
                            promise = FormStorage.fetchByItemSkuID(
                                sku_id,
                                self.getServices(),
                                self.getQuantity()
                            );
                        } else if (product_id) {
                            promise = FormStorage.fetchByItemProductID(
                                product_id,
                                self.getServices(),
                                self.getQuantity()
                            );
                        }
                    } else {
                        promise = FormStorage.fetchByCart();
                    }

                    promise.then(function () {
                        self.loadingEnd();
                    }, function () {
                        self.loadingEnd();
                    });
                }
            };

            return self;
        };

        var FormStorage = (function () {
            var self = {
                current_fetch: null,
                fetch: function (data) {
                    if (self.current_fetch != null) {
                        return;
                    }

                    return $.ajax({
                        url: config.form_url,
                        type: 'post',
                        data: data,
                        dataType: 'json',
                        beforeSend: function (xhr) {
                            self.current_fetch = xhr;
                        }
                    }).then(function (response) {
                        self.current_fetch = null;

                        var $form = $(response.data.html).filter('.buy1click-form');
                        var form = Form($form);
                        form.init(response.data.state);
                        form.reachGoal('open_form');

                        return response;
                    }, function () {
                        self.current_fetch = null;
                    });
                },
                fetchByItemSkuID: function (sku_id, services, quantity) {
                    return self.fetch({
                        type: 'item',
                        item: {
                            sku_id: sku_id,
                            quantity: quantity,
                            services: services
                        }
                    });
                },
                fetchByItemFeatures: function (product_id, features, services, quantity) {
                    return self.fetch({
                        type: 'item',
                        item: {
                            product_id: product_id,
                            quantity: quantity,
                            features: features,
                            services: services
                        }
                    });
                },
                fetchByItemProductID: function (product_id, services, quantity) {
                    return self.fetch({
                        type: 'item',
                        item: {
                            product_id: product_id,
                            quantity: quantity,
                            services: services
                        }
                    });
                },
                fetchByCart: function () {
                    return self.fetch({
                        type: 'cart'
                    });
                }
            };

            return self;
        })();

        var Form = function ($form) {
            var self = {
                ping_interval_id: null,
                current_update: null,
                current_send: null,
                init: function (state) {
                    self.setState(state);

                    /*
                        Яндекс.Советник восстанавливает удалённые из body элементы.
                        Из-за этого, после закрытия формы, она появлась снова
                        при включенном плагине Яндекс.Советник.
                        Решено было добавить обёртку в body, внутри которой будем мы будем манипулировать DOM.
                        На изменения DOM в такой обёртке Яндекс.Советник реагировать не будет.
                     */
                    let $container = $('.buy1click-container');

                    if (!$container.length) {
                        $container = $('<div class="buy1click-container"></div>');
                        $(document.body).append($container);
                    }

                    $container.append($form);
                    $('html').addClass('buy1click-body');

                    $form.on('mousedown', function (e) {
                        var is_outside_scrollbar_area = window.innerWidth - e.pageX > 20;

                        if (is_outside_scrollbar_area && $(e.target).closest('.buy1click-form__content').length === 0 && e.button === 0) {
                            self.close();
                        }
                    });

                    $form.find('.buy1click-form__close-button').on('click', function () {
                        self.close();
                    });

                    self.Items.init();
                    self.ContactInfo.init();
                    self.Shipping.init();
                    self.Payments.init();
                    self.Coupon.init();
                    self.Comment.init();
                    self.Policy.init();
                    self.Captcha.init();
                    self.Submit.init();
                    // self.ContactConfirmation.init();

                    self.ping_interval_id = setInterval(function () {
                        self.ping();
                    }, 10 * 1000);

                    self.refresh();
                },
                getState: function () {
                    return $form.data('state');
                },
                setState: function (state) {
                    $form.data('state', state);
                },
                render: function (html) {
                    $form.find('.buy1click-form__content').replaceWith($(html).find('.buy1click-form__content'));
                },
                close: function () {
                    return $.ajax({
                        url: config.close_form_url,
                        type: 'post',
                        data: {
                            state: JSON.stringify(self.getState())
                        },
                        dataType: 'json'
                    }).then(function () {
                        self.destroy();
                        $form.remove();
                        $('html').removeClass('buy1click-body');
                    });
                },
                destroy: function () {
                    clearInterval(self.ping_interval_id);
                },
                ping: function () {
                    return $.ajax({
                        url: config.ping_form_url,
                        type: 'post',
                        data: {
                            state: JSON.stringify(self.getState())
                        },
                        dataType: 'json'
                    });
                },
                update: function (external) {
                    external = external || false;
                    self.abortUpdate();

                    if (self.current_send != null) {
                        return;
                    }

                    return $.ajax({
                        url: config.update_form_url,
                        type: 'post',
                        data: {
                            state: JSON.stringify(self.getState()),
                            external: external
                        },
                        dataType: 'json',
                        beforeSend: function (xhr) {
                            self.current_update = xhr;
                        }
                    }).then(function (response) {
                        self.current_update = null;

                        if (response.data.state) {
                            var state = self.getState();
                            state.errors = response.data.state.errors;
                            self.setState(state);
                            self.Items.render(response.data.html);
                            self.ContactInfo.render(response.data.html);
                            self.Shipping.render(response.data.html, external);
                            self.Payments.render(response.data.html);
                            self.Confirmation.render(response.data.html);
                            self.Submit.updateState();
                        }
                    }, function (xhr, text_status, error_thrown) {
                        if (text_status == 'abort') {
                            return;
                        }

                        self.Shipping.loadingEnd();
                        self.Payments.loadingEnd();
                        self.Confirmation.loadingEnd();
                        console.error(error_thrown);
                    });
                },
                abortUpdate: function () {
                    if (self.current_update != null) {
                        self.current_update.abort();
                        self.current_update = null;
                    }
                },
                send: function () {
                    if (self.current_send != null) {
                        return;
                    }

                    self.abortUpdate();

                    self.Submit.loading();
                    self.Submit.disable();
                    var dfd = $.Deferred();

                    setTimeout(function () {
                        $.ajax({
                            url: config.send_form_url,
                            type: 'post',
                            data: $.extend({
                                state: JSON.stringify(self.getState())
                            }, self.Captcha.getData()),
                            dataType: 'json',
                            beforeSend: function (xhr) {
                                self.current_send = xhr;
                            }
                        }).then(function (response) {
                            if (response.data.redirect_url) {
                                self.reachGoal('send_form');

                                if (window.shop_buy1step_jquery) {
                                    window.shop_buy1step_jquery('.buy1step-form').each(function (index, _form) {
                                        var form = window.shop_buy1step_jquery(_form).data('buy1step');

                                        if (form && form.destroyExitConfirm) {
                                            form.destroyExitConfirm();
                                        }
                                    });
                                }

                                window.location = response.data.redirect_url;

                                return;
                            }

                            self.current_send = null;

                            self.Submit.loadingEnd();
                            self.render(response.data.html);
                            self.destroy();
                            self.init(response.data.state);

                            var state = self.getState();

                            if (state.errors.confirm_channel) {
                                self.ContactConfirmation.init();
                            } else {
                                self.reachGoal('send_fail_form');
                            }
                        }, function (xhr, text_status, error_thrown) {
                            self.current_send = null;

                            self.Shipping.loadingEnd();
                            self.Payments.loadingEnd();
                            self.Confirmation.loadingEnd();
                            self.Submit.loadingEnd();
                            self.Submit.enable();
                            console.error(error_thrown);
                            alert('Произошла ошибка. Попробуйте ещё раз.');
                        }).then(dfd.resolve, dfd.reject);
                    }, 0);

                    return dfd;
                },
                sendChannelAddress: function (channel_type) {
                    if (self.current_send != null) {
                        return;
                    }

                    var address = self.ContactConfirmation.getChannelAddressInput().val();

                    self.abortUpdate();

                    self.ContactConfirmation.loading();
                    self.ContactConfirmation.disableButton();

                    setTimeout(function () {
                        $.ajax({
                            url: config.send_channel_address_url,
                            type: 'post',
                            data: {
                                state: JSON.stringify(self.getState()),
                                channel_type: channel_type,
                                address: address
                            },
                            dataType: 'json',
                            beforeSend: function (xhr) {
                                self.current_send = xhr;
                            }
                        }).then(function (response) {
                            self.current_send = null;

                            self.ContactConfirmation.loadingEnd();
                            self.ContactConfirmation.enableButton();
                            self.ContactConfirmation.hideErrors();

                            if (response.errors && response.errors.length !== 0) {
                                self.ContactConfirmation.handleErrors(response.errors);

                                return;
                            }

                            if (response.data && response.data.success) {
                                self.ContactInfo.setField(response.data.channel_type, response.data.address);
                            }

                            self.ContactConfirmation.setCodeStep(channel_type);
                        }, function (xhr, text_status, error_thrown) {
                            self.current_send = null;

                            self.ContactConfirmation.loadingEnd();
                            self.ContactConfirmation.enableButton();
                            self.ContactConfirmation.hideErrors();

                            console.error(error_thrown);
                            alert('Произошла ошибка. Попробуйте ещё раз.');
                        });
                    }, 0);
                },
                sendChannelCode: function (channel_type) {
                    if (self.current_send != null) {
                        return;
                    }

                    var code = self.ContactConfirmation.getCodeInput().val();

                    if (code.trim() === '') {
                        self.ContactConfirmation.handleErrors([{
                            id: 'empty_code_error',
                            text: 'Чтобы завершить оформление заказа, введите проверочный код.'
                        }]);

                        return;
                    }

                    self.abortUpdate();

                    self.ContactConfirmation.loading();
                    self.ContactConfirmation.disableButton();

                    setTimeout(function () {
                        $.ajax({
                            url: config.send_channel_code_url,
                            type: 'post',
                            data: {
                                state: JSON.stringify(self.getState()),
                                channel_type: channel_type,
                                code: code
                            },
                            dataType: 'json',
                            beforeSend: function (xhr) {
                                self.current_send = xhr;
                            }
                        }).then(function (response) {
                            self.current_send = null;

                            self.ContactConfirmation.hideErrors();

                            if (response.errors && response.errors.length !== 0) {
                                self.ContactConfirmation.loadingEnd();
                                self.ContactConfirmation.enableButton();
                                self.ContactConfirmation.handleErrors(response.errors);

                                return;
                            }

                            self.send();
                        }, function (xhr, text_status, error_thrown) {
                            self.current_send = null;

                            self.ContactConfirmation.loadingEnd();
                            self.ContactConfirmation.enableButton();
                            self.ContactConfirmation.hideErrors();
                            console.error(error_thrown);
                            alert('Произошла ошибка. Попробуйте ещё раз.');
                        });
                    }, 0);
                },
                refresh: function () {
                    $form.find('input:text:not(.buy1click-input-text)').addClass('buy1click-input-text');
                    $form.find('select:not(.buy1click-select)').addClass('buy1click-select');

                    $form.find('select.buy1click-select, :checkbox.buy1click-checkbox').styler();
                    $form.find('select.buy1click-select, :checkbox.buy1click-checkbox').each(function () {
                        var $this = $(this);

                        setTimeout(function () {
                            $this.trigger('refresh');
                        }, 0);
                    });
                    $form.find(':checkbox.buy1click-checkbox').off('refresh.styler').on('refresh.styler', function () {
                        $(this).closest('.jq-checkbox').find('.jq-checkbox__div').html(
                            '<svg class="buy1click-svg-icon buy1click-checkbox__icon" width="12" height="9"><use class="buy1click-svg-icon__content" xlink:href="' + config.wa_url + 'wa-apps/shop/plugins/buy1click/svg/icon.sprite.svg#checkbox-arrow" fill="#F2994A" /></svg>');
                    });

                    $form.find('select.buy1click-select').off('refresh.styler').on('refresh.styler', function () {
                        $(this).closest('.jq-selectbox').find('.jq-selectbox__trigger').html(
                            '<svg class="buy1click-svg-icon" width="8" height="5"><use class="buy1click-svg-icon__content" xlink:href="' + config.wa_url + 'wa-apps/shop/plugins/buy1click/svg/icon.sprite.svg#arrow" fill="#333333" /></svg>');
                    });
                },
                reachGoal: function (target) {
                    var settings = self.getState().settings;
                    var ymCounterNumber = settings.form_target_ym_counter;

                    if (ymCounterNumber) {
                        var ymCounter = window['yaCounter' + ymCounterNumber];
                        var ymTarget = settings['form_target_ym_' + target];

                        if (ymCounter && ymTarget) {
                            ymCounter.reachGoal(ymTarget);
                        }
                    }

                    var gaTargetCategory = settings['form_target_ga_category_' + target];
                    var gaTargetAction = settings['form_target_ga_action_' + target];

                    var _gtag = null;

                    if (window.gtag) {
                        _gtag = window.gtag;
                    } else if (window.getEcommercePluginInstance) {
                        var ecommerce = window.getEcommercePluginInstance();

                        if (ecommerce && ecommerce._google_enhanced_ecommerce) {
                            _gtag = ecommerce._google_enhanced_ecommerce._pushToDataLayer;
                        }
                    }

                    if (_gtag && (gaTargetAction || gaTargetCategory)) {
                        _gtag('event', gaTargetAction, {
                            event_category: gaTargetCategory
                        });
                    }
                },
                Items: (function () {
                    return {
                        is_updated: false,
                        init: function () {
                            self.Items.is_updated = false;

                            $form.find('.buy1click-item-quantity').each(function () {
                                var change_quantity_timeout = null;
                                var $quantity = $(this);
                                var item_id = self.Items.getItemID($quantity);
                                var $input = $quantity.find('.buy1click-item-quantity__input');

                                $quantity.find('.buy1click-item-quantity__minus').on('click', function () {
                                    var quantity = self.Items.getQuantity(item_id);
                                    quantity = Math.max(1, +quantity - 1);
                                    self.Items.setQuantity(item_id, quantity);
                                    $input.val(quantity);

                                    self.abortUpdate();
                                    clearTimeout(change_quantity_timeout);
                                    change_quantity_timeout = setTimeout(function () {
                                        $input.trigger('change');
                                    }, 500);
                                });

                                $quantity.find('.buy1click-item-quantity__plus').on('click', function () {
                                    var quantity = self.Items.getQuantity(item_id);
                                    quantity = +quantity + 1;
                                    self.Items.setQuantity(item_id, quantity);
                                    $input.val(quantity);

                                    self.abortUpdate();
                                    clearTimeout(change_quantity_timeout);
                                    change_quantity_timeout = setTimeout(function () {
                                        $input.trigger('change');
                                    }, 500);
                                });

                                $input.on('change', function () {
                                    clearTimeout(change_quantity_timeout);

                                    var quantity = parseInt($input.val()) || 1;
                                    self.Items.setQuantity(item_id, quantity);
                                    $input.val(quantity);

                                    self.Items.is_updated = true;
                                    self.Shipping.is_updated = true;
                                    self.Shipping.loading();
                                    self.Payments.loading();
                                    self.Confirmation.loading();
                                    self.update();
                                });
                            });

                            $form.toggleClass('buy1click-form_min-total-error', self.Items.isMinTotalError());
                            $form.toggleClass('buy1click-form_available-error', self.Items.isAvailableError());
                        },
                        render: function (html) {
                            if (!self.Items.is_updated) {
                                return;
                            }

                            $form.find('.buy1click-form__items').replaceWith($(html).find('.buy1click-form__items'));
                            self.Items.init();
                        },
                        getItems: function () {
                            var state = self.getState();

                            return state.cart.items;
                        },
                        setItems: function (items) {
                            var state = self.getState();
                            state.cart.items = items;
                            self.setState(state);
                        },
                        isMinTotalError: function () {
                            var state = self.getState();

                            return !!state.errors.min_order;
                        },
                        isAvailableError: function () {
                            var state = self.getState();

                            return !!state.errors.available;
                        },
                        getItemID: function ($elm) {
                            return $elm.closest('.buy1click-item').data('item_id');
                        },
                        getItem: function (item_id) {
                            var items = self.Items.getItems();

                            return items[item_id] ? items[item_id] : null;
                        },
                        setItem: function (item_id, item) {
                            var items = self.Items.getItems();
                            items[item_id] = item;
                            self.Items.setItems(items);
                        },
                        getQuantity: function (item_id) {
                            var item = self.Items.getItem(item_id);

                            return item ? item.quantity : null;
                        },
                        setQuantity: function (item_id, quantity) {
                            var item = self.Items.getItem(item_id);

                            if (item == null) {
                                return;
                            }

                            item.quantity = quantity;
                            self.Items.setItem(item_id, item);
                        }
                    };
                })(),
                ContactInfo: (function () {
                    return {
                        is_updated: false,
                        is_change_country: false,
                        init: function () {
                            self.ContactInfo.is_updated = false;

                            $form.find('.buy1click-form__contact-info')
                                .find('.buy1click-input-text, select.buy1click-select').on('change', function (e) {
                                    var $input = $(e.target);
                                    var $field = $input.closest('.buy1click-form-field');
                                    var field_id = $field.data('field_id');

                                    setTimeout(function () {
                                        var value = $input.val();
                                        self.ContactInfo.setField(field_id, value);
                                        var is_address_field = field_id.indexOf('address_') === 0;

                                        if (!is_address_field) {
                                            return;
                                        }

                                        if (field_id == 'address_country') {
                                            self.ContactInfo.is_change_country = true;
                                        }

                                        if (field_id == 'address_city') {
                                            if (value.toLowerCase() == 'москва') {
                                                $form.find('.buy1click-region-field select').val(77)
                                                    .trigger('refresh')
                                                    .trigger('change');
                                            }

                                            if (value.toLowerCase() == 'санкт-петербург') {
                                                $form.find('.buy1click-region-field select').val(78)
                                                    .trigger('refresh')
                                                    .trigger('change');
                                            }
                                        }

                                        self.Shipping.is_updated = true;
                                        self.Shipping.loading();
                                        self.Payments.loading();
                                        self.Confirmation.loading();
                                        self.update();
                                    }, 0);
                                });

                            $form.find('.buy1click-form-field_masked').each(function () {
                                var $field = $(this);
                                var mask = $field.data('mask');

                                if (mask) {
                                    var $field_input = $field.find('input');
                                    var current_val = $field_input.val();

                                    if (current_val) {
                                        var prefix = mask.replace(/\D/g, '');
                                        var prefix_regexp = new RegExp('^' + prefix);
                                        var without_prefix = current_val.replace(prefix_regexp, '');
                                        $field_input.val(without_prefix);
                                    }

                                    $field.find('.buy1click-form-field__input').inputmask(mask + '', {
                                        definitions: {
                                            '#': {
                                                validator: '[0-9]'
                                            }
                                        },
                                        clearIncomplete: true
                                    });
                                    $field_input.val(without_prefix);
                                }
                            });
                        },
                        render: function (html) {
                            if (!self.ContactInfo.is_updated) {
                                if (!self.ContactInfo.is_change_country) {
                                    return;
                                }

                                self.ContactInfo.is_change_country = false;
                                $form.find('.buy1click-region-field').replaceWith($(html).find('.buy1click-region-field'));
                                self.ContactInfo.init();

                                return;
                            }

                            $form.find('.buy1click-form__contact-info').replaceWith(
                                $(html).find('.buy1click-form__contact-info'));
                            self.ContactInfo.init();
                            self.refresh();
                        },
                        renderRegion: function (html) {
                            $form.find('.buy1click-region-field').replaceWith($(html).find('.buy1click-region-field'));
                            self.ContactInfo.init();
                        },
                        getField: function (field_id) {
                            var state = self.getState();

                            if (field_id.indexOf('address_') === 0) {
                                field_id = field_id.replace(/^address_/, '');

                                return state.contact_info.shipping_address[field_id];
                            }

                            return state.contact_info[field_id] ? state.contact_info[field_id] : null;
                        },
                        setField: function (field_id, value) {
                            var state = self.getState();

                            if (field_id.indexOf('address_') === 0) {
                                field_id = field_id.replace(/^address_/, '');
                                state.contact_info.shipping_address[field_id] = value;
                            } else {
                                state.contact_info[field_id] = value;
                            }

                            self.setState(state);
                        }
                    };
                })(),
                Shipping: (function () {
                    return {
                        is_updated: false,
                        init: function (external) {
                            external = external || false;

                            self.Shipping.is_updated = false;
                            self.Shipping.updateChecked();

                            $form.find('.buy1click-form__shipping :radio').on('change', function () {
                                self.Shipping.updateChecked();
                                self.Payments.loading();
                                self.Confirmation.loading();
                                self.update(true);
                            });

                            $form.find('.buy1click-shipping').on('click', function (e) {
                                if ($(e.target).closest('.jq-selectbox').length) {
                                    e.preventDefault();
                                }
                            });

                            $form.find('select.buy1click-shipping__rates').on('change', function () {
                                var $shipping = $(this).closest('.buy1click-shipping');

                                if ($shipping.data('shipping_id') != self.Shipping.getSelectedShippingID()) {
                                    $shipping.find(':radio').prop('checked', true).trigger('change');
                                } else {
                                    self.Shipping.updateChecked();
                                    self.Confirmation.loading();
                                    self.update(true);
                                }
                            });

                            $form.find('.buy1click-shipping__custom-fields').on('change', function () {
                                var $$form = $(this);
                                var params = $('<form/>').append($$form.clone()).serializeArray().reduce(function (params, elem) {
                                    var name = elem.name.replace(/^params\[(.*)]$/, '$1');
                                    var names = name.split('.');

                                    // Костыль..
                                    if (names.length == 2) {
                                        params[names[0]] = params[names[0]] || {};
                                        params[names[0]][names[1]] = elem.value;
                                    } else {
                                        params[name] = elem.value;
                                    }

                                    return params;
                                }, {});

                                self.Shipping.setShippingParams(params);
                            });

                            if (external) {
                                self.Confirmation.loading();
                            } else {
                                self.Shipping.is_updated = true;
                            }

                            self.update(true);
                        },
                        render: function (html, external) {
                            if (!self.Shipping.is_updated) {
                                return;
                            }

                            $form.find('.buy1click-form__shipping').replaceWith($(html).find('.buy1click-form__shipping'));
                            self.Shipping.init(external);
                            self.refresh();
                        },
                        loading: function () {
                            $form.find('.buy1click-form__shipping').addClass('buy1click-form__shipping_loading');
                        },
                        loadingEnd: function () {
                            $form.find('.buy1click-form__shipping').removeClass('buy1click-form__shipping_loading');
                        },
                        getSelectedShippingID: function () {
                            var state = self.getState();

                            return state.session.selected_shipping_id;
                        },
                        setSelectedShippingID: function (shipping_id) {
                            var state = self.getState();
                            state.session.selected_shipping_id = shipping_id;
                            self.setState(state);
                        },
                        getSelectedShippingRateID: function () {
                            var state = self.getState();

                            return state.session.selected_shipping_rate_id;
                        },
                        setSelectedShippingRateID: function (shipping_rate_id) {
                            var state = self.getState();
                            state.session.selected_shipping_rate_id = shipping_rate_id;
                            self.setState(state);
                        },
                        setSelectedShippingRateType: function (shipping_rate_type) {
                            let state = self.getState();
                            state.session.selected_shipping_rate_type = shipping_rate_type;
                            self.setState(state);
                        },
                        getShippingParams: function () {
                            var state = self.getState();

                            return state.session.shipping_params;
                        },
                        setShippingParams: function (shipping_params) {
                            var state = self.getState();
                            state.session.shipping_params = shipping_params;
                            self.setState(state);
                        },
                        updateChecked: function () {
                            $form.find('.buy1click-shipping_checked')
                                .removeClass('buy1click-shipping_checked');
                            var $shipping = $form.find('.buy1click-form__shipping :radio:checked')
                                .closest('.buy1click-shipping');
                            $shipping.addClass('buy1click-shipping_checked');
                            self.Shipping.setSelectedShippingID($shipping.data('shipping_id'));
                            var $rate = $shipping.find('select.buy1click-shipping__rates :selected');
                            self.Shipping.setSelectedShippingRateID($rate.data('rate_id'));
                            self.Shipping.setSelectedShippingRateType($rate.data('type'));

                            var settings = self.getState().settings;

                            $form.find('.buy1click-shipping').each(function () {
                                var $shipping = $(this);
                                var $rate = $shipping.find('select.buy1click-shipping__rates :selected');

                                var rate_rate = settings.ignore_shipping_rate_in_total == '1'
                                    ? ''
                                    : $rate.data('rate');

                                var rate_compare_rate = settings.ignore_shipping_rate_in_total == '1'
                                    ? ''
                                    : $rate.data('compare_rate');

                                $shipping.find('.buy1click-shipping__rate').html(rate_rate)
                                    .toggleClass('buy1click-shipping__rate_empty', !rate_rate);
                                $shipping.find('.buy1click-shipping__compare-rate').html(rate_compare_rate)
                                    .toggleClass('buy1click-shipping__compare-rate_empty', !rate_compare_rate);
                                $shipping.find('.buy1click-shipping__est-delivery').html($rate.data('est_delivery'))
                                    .toggleClass('buy1click-shipping__est-delivery_empty', !$rate.data('est_delivery'));
                                $shipping.find('.buy1click-shipping__comment').html($rate.data('comment'))
                                    .toggleClass('buy1click-shipping__comment_empty', !$rate.data('comment'));
                            });
                        },
                        isSelectedError: function () {
                            var state = self.getState();

                            if (
                                state.settings.form_shipping === 'disabled'
                                || state.settings.form_shipping_allow_checkout_without_shipping
                            ) {
                                return false;
                            }

                            return !self.Shipping.getSelectedShippingID();
                        }
                    };
                })(),
                Payments: (function () {
                    return {
                        init: function () {
                            self.Payments.updateChecked();

                            $form.find('.buy1click-form__payments :radio').on('change', function () {
                                self.Payments.updateChecked();

                                if (config.is_increase_plugin_enabled) {
                                    self.Confirmation.loading();
                                    self.update(true);
                                }
                            });
                        },
                        render: function (html) {
                            $form.find('.buy1click-form__payments').replaceWith($(html).find('.buy1click-form__payments'));
                            self.Payments.init();
                        },
                        loading: function () {
                            $form.find('.buy1click-form__payments').addClass('buy1click-form__payments_loading');
                        },
                        loadingEnd: function () {
                            $form.find('.buy1click-form__payments').removeClass('buy1click-form__payments_loading');
                        },
                        getSelectedPaymentID: function () {
                            var state = self.getState();

                            return state.session.selected_payment_id;
                        },
                        setSelectedPaymentID: function (payment_id) {
                            var state = self.getState();
                            state.session.selected_payment_id = payment_id;
                            self.setState(state);
                        },
                        updateChecked: function () {
                            $form.find('.buy1click-payment_checked')
                                .removeClass('buy1click-payment_checked');
                            var $payment = $form.find('.buy1click-form__payments :radio:checked')
                                .closest('.buy1click-payment');
                            $payment.addClass('buy1click-payment_checked');
                            self.Payments.setSelectedPaymentID($payment.data('payment_id'));
                        }
                    };
                })(),
                Confirmation: (function () {
                    return {
                        loading: function () {
                            $form.find('.buy1click-form__total-box').addClass('buy1click-form__total-box_loading');
                        },
                        loadingEnd: function () {
                            $form.find('.buy1click-form__total-box').removeClass('buy1click-form__total-box_loading');
                        },
                        render: function (html) {
                            $form.find('.buy1click-form__total-box').replaceWith(
                                $(html).find('.buy1click-form__total-box'));
                        }
                    };
                })(),
                Coupon: (function () {
                    return {
                        init: function () {
                            $form.find('.buy1click-form__coupon').on('change', function () {
                                var $input = $(this);
                                self.Coupon.setCoupon($input.val());
                                self.Shipping.is_updated = true;
                                self.Shipping.loading();
                                self.Payments.loading();
                                self.Confirmation.loading();
                                self.update();
                            });
                        },
                        getCoupon: function () {
                            var state = self.getState();

                            return state.session.coupon;
                        },
                        setCoupon: function (coupon) {
                            var state = self.getState();
                            state.session.coupon = coupon;
                            self.setState(state);
                        }
                    };
                })(),
                Comment: (function () {
                    return {
                        init: function () {
                            $form.find('.buy1click-form__comment-input').on('change', function () {
                                var $input = $(this);
                                self.Comment.setComment($input.val());
                            });
                        },
                        getComment: function () {
                            var state = self.getState();

                            return state.session.comment;
                        },
                        setComment: function (comment) {
                            var state = self.getState();
                            state.session.comment = comment;
                            self.setState(state);
                        }
                    };
                })(),
                Policy: (function () {
                    return {
                        init: function () {
                            $form.find('.buy1click-form__policy :checkbox').on('change', function (e) {
                                self.Policy.setChecked(e.target.checked);
                                self.Submit.updateState();
                            });
                        },
                        getChecked: function () {
                            var state = self.getState();

                            return state.session.is_checked_policy;
                        },
                        setChecked: function (is_checked_policy) {
                            var state = self.getState();
                            state.session.is_checked_policy = is_checked_policy;
                            self.setState(state);
                        }
                    };
                })(),
                Captcha: (function () {
                    return {
                        init: function () {
                            if (window.onloadWaRecaptchaCallback) {
                                try {
                                    window.onloadWaRecaptchaCallback();
                                } catch (e) {
                                    console.log(e);
                                }
                            }
                        },
                        getData: function () {
                            var data = {};

                            $form.find('.buy1click-form__captcha input, .buy1click-form__captcha textarea').each(
                                function () {
                                    var $input = $(this);
                                    data[$input.attr('name')] = $input.val();
                                });

                            return data;
                        }
                    };
                })(),
                Submit: (function () {
                    return {
                        init: function () {
                            self.Submit.updateState();
                            $form.find('.buy1click-form__submit-button').on('click', function () {
                                self.send();
                            });
                        },
                        loading: function () {
                            $form.find('.buy1click-form__submit-button').addClass('buy1click-form-button_loading');
                        },
                        loadingEnd: function () {
                            $form.find('.buy1click-form__submit-button').removeClass('buy1click-form-button_loading');
                        },
                        getButton: function () {
                            return $form.find('.buy1click-form__submit-button');
                        },
                        updateState: function () {
                            if (
                                self.Policy.getChecked()
                                && !self.Items.isMinTotalError()
                                && !self.Items.isAvailableError()
                                && !self.Shipping.isSelectedError()
                            ) {
                                self.Submit.enable();
                            } else {
                                self.Submit.disable();
                            }
                        },
                        disable: function () {
                            self.Submit.getButton().prop('disabled', true);
                        },
                        enable: function () {
                            self.Submit.getButton().prop('disabled', false);
                        }
                    };
                })(),
                ContactConfirmation: (function () {
                    return {
                        step: '',
                        init: function () {
                            self.ContactConfirmation.setAddressStep(self.ContactConfirmation.getChannelType());
                        },
                        initResendCode: function (channel_type) {
                            self.ContactConfirmation.getReSendCodeLink()
                                .off('click')
                                .on('click', function (event) {
                                    event.preventDefault();

                                    self.sendChannelAddress(channel_type);
                                });
                        },
                        setAddressStep: function (channel_type) {
                            self.step = 'address';

                            $form.toggleClass('buy1click-form_step-address', true);
                            $form.toggleClass('buy1click-form_step-code', false);

                            self.ContactConfirmation.getChannelAddressInput().prop('readonly', false);
                            self.ContactConfirmation.getButton()
                                .off('click')
                                .on('click', function () {
                                    self.sendChannelAddress(channel_type);
                                });

                            self.ContactConfirmation.getButton().find('.buy1click-form-button-label').text('Выслать код');
                        },
                        setCodeStep: function (channel_type) {
                            self.step = 'code';

                            $form.toggleClass('buy1click-form_step-address', false);
                            $form.toggleClass('buy1click-form_step-code', true);

                            self.ContactConfirmation.getChannelAddressInput().prop('readonly', true);
                            self.ContactConfirmation.getCodeInput()
                                .closest('.buy1click-form-field')
                                .removeClass('buy1click-form-field_hidden');
                            self.ContactConfirmation.getButton()
                                .off('click')
                                .on('click', function () {
                                    self.sendChannelCode(channel_type);
                                });

                            self.ContactConfirmation.initResendCode(channel_type);

                            var is_last_channel = self.ContactConfirmation.getIsLastChannel();

                            self.ContactConfirmation.getButton()
                                .find('.buy1click-form-button-label')
                                .text(is_last_channel ? 'Завершить оформление' : 'Готово');

                            self.ContactConfirmation.startReSendTimer(60);
                        },
                        startReSendTimer: function (timer_seconds) {
                            var $timer = $form.find('.buy1click-form__re-send-timer-wrapper');
                            var $timer_time = $timer.find('.buy1click-form__re-send-timer-time');
                            var $re_send_button = self.ContactConfirmation.getReSendCodeLink();

                            /**
                             * @param {int} time
                             * @return {string}
                             */
                            var formatTime = function (time) {
                                if (!(time >= 0)) {
                                    return '';
                                }

                                var minutes = Math.floor(time / 60);
                                var seconds = time - (minutes * 60);

                                if (minutes < 10) {
                                    minutes = '0' + minutes;
                                }

                                if (seconds < 10) {
                                    seconds = '0' + seconds;
                                }

                                return minutes + ':' + seconds;
                            };

                            $timer.removeClass('buy1click-form__re-send-timer-wrapper_hidden');
                            $re_send_button.addClass('buy1click-form__re-send-link_hidden');

                            var start_timestamp = (new Date()).getTime();
                            var timer_interval = setInterval(function () {
                                var seconds_remains = parseInt(Math.floor((start_timestamp - (new Date()).getTime()) / 1000) + timer_seconds);

                                if (seconds_remains >= 0) {
                                    $timer_time.text(formatTime(seconds_remains));
                                } else {
                                    clearInterval(timer_interval);
                                    $timer.addClass('buy1click-form__re-send-timer-wrapper_hidden');
                                    $re_send_button.removeClass('buy1click-form__re-send-link_hidden');
                                }
                            }, 100);
                        },
                        getButton: function () {
                            return $form.find('.buy1click-form__submit-contact-confirmation-button');
                        },
                        getChannelAddressInput: function () {
                            return $form.find('.buy1click-form__confirmation-channel-address');
                        },
                        getCodeInput: function () {
                            return $form.find('.buy1click-form__confirmation-channel-code');
                        },
                        getChannelType: function () {
                            var state = self.getState();

                            return state.session.confirmation_channel_type;
                        },
                        getIsLastChannel: function () {
                            var state = self.getState();

                            return state.session.confirmation_channel_is_last_channel;
                        },
                        loading: function () {
                            $form.find('.buy1click-form__submit-contact-confirmation-button').addClass('buy1click-form-button_loading');
                        },
                        loadingEnd: function () {
                            $form.find('.buy1click-form__submit-contact-confirmation-button').removeClass('buy1click-form-button_loading');
                        },
                        disableButton: function () {
                            self.ContactConfirmation.getButton().prop('disabled', true);
                        },
                        enableButton: function () {
                            self.ContactConfirmation.getButton().prop('disabled', false);
                        },
                        getReSendCodeLink: function () {
                            return $form.find('.buy1click-form__re-send-link');
                        },
                        handleErrors: function (errors) {
                            self.ContactConfirmation.hideErrors();

                            errors.forEach(function (error) {
                                var is_channel_error = (error.id === 'channel_error' && self.step === 'address')
                                  || error.id === 'timeout_error'
                                  || error.id === 'source_error'
                                  || error.id === 'send_error';

                                var is_code_error = (error.id === 'channel_error' && self.step === 'code')
                                  || error.id === 'storage_error'
                                  || error.id === 'code_attempts_error'
                                  || error.id === 'empty_code_error'
                                  || error.id === 'code_error';

                                var error_selector = '';

                                if (is_channel_error) {
                                    error_selector = '.buy1click-form__channel-error';
                                } else if (is_code_error) {
                                    error_selector = '.buy1click-form__code-error';
                                } else {
                                    console.warn(error);

                                    return;
                                }

                                $form.find(error_selector)
                                    .text(error.text)
                                    .removeClass('buy1click-form__error_hidden');
                            });
                        },
                        hideErrors: function () {
                            $form.find('.buy1click-form__error').addClass('buy1click-form__error_hidden');
                        },
                        getCurrentChannelType() {
                            return self.ContactConfirmation.getChannelAddressInput().data('type');
                        }
                    };
                })()
            };

            return self;
        };

        var initButton = function ($button) {
            var button = Button($button);

            if (!button.isInit()) {
                button.init();
            }
        };

        var initButtons = function () {
            $('.buy1click-open-button').each(function () {
                var $button = $(this);

                setTimeout(function () {
                    initButton($button);
                }, 0);
            });
        };

        window.shop_buy1click = {
            Button: Button,
            FormStorage: FormStorage,
            Form: Form,
            initButtons: initButtons
        };

        $(document).ajaxComplete(function () {
            setTimeout(function () {
                window.shop_buy1click.initButtons();
            }, 0);
        });

        window.shop_buy1click.initButtons();
    });
})(jQuery);
