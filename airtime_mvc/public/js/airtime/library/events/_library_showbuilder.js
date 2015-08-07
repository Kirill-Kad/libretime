var AIRTIME = (function(AIRTIME) {
    var mod;

    if (AIRTIME.library === undefined) {
        AIRTIME.library = {};
    }

    mod = AIRTIME.library;

    mod.checkAddButton = function() {
        var selected = mod.getChosenItemsLength(), $cursor = $('tr.sb-selected'), check = false,
            shows = $('tr.sb-header'), current = $('tr.sb-current-show'),
        // TODO: this is an ugly way of doing this... we should find a more robust way of checking which view we're in.
            btnText = (window.location.href.toLowerCase().indexOf("schedule") > -1) ? $.i18n._('Add to show') : $.i18n._('Add to next show');

        // make sure library items are selected and a cursor is selected.
        if (selected !== 0) {
            check = true;
        }

        if (shows.length === 0) {
            check = false;
        }

        if (check) {
            AIRTIME.button.enableButton("btn-group #library-plus", false);
        } else {
            AIRTIME.button.disableButton("btn-group #library-plus", false);
        }

        if ($("#show_builder_table").is(":visible")) {
            if ($cursor.length !== 0) {
                btnText = $.i18n._('Add after selected items');
            } else if (current.length !== 0) {
                btnText = $.i18n._('Add to current show');
            }
        } else {
            var objType = $('.active-tab .obj_type').val();
            if (objType === 'block') {
                btnText = $.i18n._('Add to current smart block');
            } else {
                btnText = $.i18n._('Add to current playlist');
            }
        }
        AIRTIME.library.changeAddButtonText($('.btn-group #library-plus #lib-plus-text'), btnText);
    };

    mod.fnRowCallback = function(nRow, aData, iDisplayIndex, iDisplayIndexFull) {
        var $nRow = $(nRow);

        if (aData.ftype === "audioclip") {
            $nRow.addClass("lib-audio");
            $image = $nRow.find('td.library_type');
            if (!isAudioSupported(aData.mime)) {
                $image.html('<span class="ui-icon ui-icon-locked"></span>');
                aData.image = '<span class="ui-icon ui-icon-locked"></span>';
            }
        } else if (aData.ftype === "stream") {
            $nRow.addClass("lib-stream");
        } else {
            $nRow.addClass("lib-pl");
        }

        $nRow.attr("id", aData["tr_id"]).data("aData", aData).data("screen",
            "timeline");
    };

    mod.fnDrawCallback = function fnLibDrawCallback() {

        mod.redrawChosen();
        mod.checkToolBarIcons();

        if ($("#show_builder_table").is(":visible")) {
            $('#library_display tr.lib-audio, tr.lib-pl, tr.lib-stream')
                .draggable(
                {
                    helper: function () {

                        var $el = $(this), selected = mod
                            .getChosenItemsLength(), container, thead = $("#show_builder_table thead"), colspan = thead
                            .find("th").length, width = $el.width(), message;

                        // dragging an element that has an unselected
                        // checkbox.
                        if (mod.isChosenItem($el) === false) {
                            selected++;
                        }

                        if (selected === 1) {
                            message = $.i18n._("Adding 1 Item");
                        } else {
                            message = sprintf($.i18n._("Adding %s Items"), selected);
                        }

                        container = $('<div/>').attr('id',
                            'draggingContainer').append('<tr/>')
                            .find("tr").append('<td/>').find("td")
                            .attr("colspan", colspan).width(width)
                            .addClass("ui-state-highlight").append(
                            message).end().end();

                        return container;
                    },
                    cursor: 'pointer',
                    cursorAt: {
                        top: 30,
                        left: 100
                    },
                    connectToSortable: '#show_builder_table'
                });
        } else {
            $('#library_display tr.lib-audio, tr.lib-stream, tr.lib-pl, tr.lib-block')
                .draggable(
                {
                    helper: function () {

                        var $el = $(this), selected = mod
                                .getChosenAudioFilesLength(), container, message, li = $(".side_playlist.active-tab ul.spl_sortable li:first"),
                            width = li.width(), height = 55;
                        if (width > 798) width = 798;

                        // dragging an element that has an unselected
                        // checkbox.
                        if (mod.isChosenItem($el) === false) {
                            selected++;
                        }

                        if (selected === 1) {
                            message = $.i18n._("Adding 1 Item");
                        } else {
                            message = sprintf($.i18n._("Adding %s Items"), selected);
                        }

                        container = $('<div class="helper"/>').append(
                            "<li/>").find("li").addClass(
                            "ui-state-default").append("<div/>")
                            .find("div").addClass(
                            "list-item-container").append(
                            message).end().width(width)
                            .height(height).end();

                        return container;
                    },
                    cursor: 'pointer',
                    cursorAt: {
                        top: 30,
                        left: 100
                    },
                    connectToSortable: '.active-tab .spl_sortable'
                });
        }
    };

    mod.dblClickAdd = function(data, type) {
        var i, length, temp, aMediaIds = [], aSchedIds = [], aData = [];

        if ($("#show_builder_table").is(":visible")) {
            // process selected files/playlists.
            aMediaIds.push({
                "id": data.id,
                "type": type
            });

            $("#show_builder_table tr.sb-selected").each(function (i, el) {
                aData.push($(el).data("aData"));
            });

            // process selected schedule rows to add media after.
            for (i = 0, length = aData.length; i < length; i++) {
                temp = aData[i];
                aSchedIds.push({
                    "id": temp.id,
                    "instance": temp.instance,
                    "timestamp": temp.timestamp
                });
            }

            if (aSchedIds.length == 0) {
                if (!addToCurrentOrNext(aSchedIds)) {
                    return;
                }
            }

            AIRTIME.showbuilder.fnAdd(aMediaIds, aSchedIds);
        } else {
            // process selected files/playlists.
            aMediaIds.push(new Array(data.id, data.ftype));

            // check if a playlist/block is open before adding items
            if ($('.active-tab .obj_type').val() == 'playlist'
                || $('.active-tab .obj_type').val() == 'block') {
                AIRTIME.playlist.fnAddItems(aMediaIds, undefined, 'after');
            }
        }
    };

    function addToCurrentOrNext(arr) {
        var el;
        // Add to the end of the current or next show by getting the footer
        el = $(".sb-footer.sb-future:first");
        var data = el.prev().data("aData");

        if (data === undefined) {
            alert($.i18n._("Cannot schedule outside a show."));
            return false;
        }

        arr.push({
            "id" : data.id,
            "instance" : data.instance,
            "timestamp" : data.timestamp
        });

        if (!isInView(el)) {
            $('.dataTables_scrolling.sb-padded').animate({
                scrollTop: el.offset().top
            }, 0);
        }

        return true;
    }

    mod.setupLibraryToolbar = function() {
        var $toolbar = $(".lib-content .fg-toolbar:first");

        mod.createToolbarButtons();
        mod.moveSearchBarToHeader();
        
        $toolbar.append($menu);
        // add to timeline button
        $toolbar
            .find('#library-plus')
            .click(
                    function() {

                        if (AIRTIME.button.isDisabled('btn-group #library-plus') === true) {
                            return;
                        }

                        var selected = AIRTIME.library.getSelectedData(), data, i, length, temp, aMediaIds = [], aSchedIds = [], aData = [];

                        if ($("#show_builder_table").is(":visible")) {
                            for (i = 0, length = selected.length; i < length; i++) {
                                data = selected[i];
                                aMediaIds.push( {
                                    "id" : data.id,
                                    "type" : data.ftype
                                });
                            }

                            // process selected files/playlists.
                            $("#show_builder_table tr.sb-selected").each(function(i, el) {
                                aData.push($(el).data("aData"));
                            });

                            // process selected schedule rows to add media
                            // after.
                            for (i = 0, length = aData.length; i < length; i++) {
                                temp = aData[i];
                                aSchedIds.push( {
                                    "id" : temp.id,
                                    "instance" : temp.instance,
                                    "timestamp" : temp.timestamp
                                });
                            }

                            if (aSchedIds.length == 0) {
                                if (!addToCurrentOrNext(aSchedIds)) {
                                    return;
                                }
                            }

                            AIRTIME.showbuilder.fnAdd(aMediaIds, aSchedIds);
                        } else {
                            for (i = 0, length = selected.length; i < length; i++) {
                                data = selected[i];
                                aMediaIds.push([data.id, data.ftype]);
                            }

                            // check if a playlist/block is open before adding items
                            if ($('.active-tab .obj_type').val() == 'playlist'
                                || $('.active-tab .obj_type').val() == 'block') {
                                AIRTIME.playlist.fnAddItems(aMediaIds, undefined, 'after');
                            }
                        }
                    });

        // delete from library.
        $toolbar.find('.icon-trash').parent().click(function() {

            if (AIRTIME.button.isDisabled('icon-trash') === true) {
                return;
            }

            AIRTIME.library.fnDeleteSelectedItems();
        });

        $toolbar.find('#sb-new').click(function() {
            if (AIRTIME.button.isDisabled('btn-group #sb-new') === true) {
                return;
            }

            var selection = $(".media_type_selector.selected").attr("selection_id");

            if (selection == 2) {
                AIRTIME.playlist.fnNew();
            } else if (selection == 3) {
                AIRTIME.playlist.fnNewBlock();
            } else if (selection == 4) {
                AIRTIME.playlist.fnWsNew();
            }
        });


        $toolbar.find('#sb-edit').click(function() {
            if (AIRTIME.button.isDisabled('btn-group #sb-edit') === true) {
                return;
            }

            var selected = $(".lib-selected");

            selected.each(function(i, el) {
                var data = $(el).data("aData");

                if (data.ftype === "audioclip") {
                    $.get(baseUrl + "library/edit-file-md/id/" + data.id, {format: "json"}, function(json){
                        AIRTIME.playlist.fileMdEdit(json);
                        //buildEditMetadataDialog(json);
                    });
                } else if (data.ftype === "playlist" || data.ftype === "block") {
                    AIRTIME.playlist.fnEdit(data.id, data.ftype, baseUrl+'new-playlist/edit');
                    AIRTIME.playlist.validatePlaylistElements();
                } else if (data.ftype === "stream") {
                    AIRTIME.playlist.fnEdit(data.id, data.ftype, baseUrl + 'new-webstream/edit');
                }
            });
        });

        mod.createToolbarDropDown();
    };

    return AIRTIME;

}(AIRTIME || {}));
