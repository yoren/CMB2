/**
 * Controls the behaviours of custom metabox fields.
 *
 * @author Andrew Norcross
 * @author Jared Atchison
 * @author Bill Erickson
 * @author Justin Sternberg
 * @see    https://github.com/jaredatch/Custom-Metaboxes-and-Fields-for-WordPress
 */

/*jslint browser: true, devel: true, indent: 4, maxerr: 50, sub: true */
/*global jQuery, tb_show, tb_remove */

/**
 * Custom jQuery for Custom Metaboxes and Fields
 */
jQuery(document).ready(function ($) {
	'use strict';

	var formfield;
	// Uploading files
	var file_frame = false;
	var iterator = 0;

	/**
	 * Initialize timepicker (this will be moved inline in a future release)
	 */
	$('.cmb_timepicker').each(function () {
		$('#' + jQuery(this).attr('id')).timePicker({
			startTime: "07:00",
			endTime: "22:00",
			show24Hours: false,
			separator: ':',
			step: 30
		});
	});

	/**
	 * Initialize jQuery UI datepicker (this will be moved inline in a future release)
	 */
	$('.cmb_datepicker').each(function () {
		$('#' + jQuery(this).attr('id')).datepicker();
		// $('#' + jQuery(this).attr('id')).datepicker({ dateFormat: 'yy-mm-dd' });
		// For more options see http://jqueryui.com/demos/datepicker/#option-dateFormat
	});
	// Wrap date picker in class to narrow the scope of jQuery UI CSS and prevent conflicts
	$("#ui-datepicker-div").wrap('<div class="cmb_element" />');

	/**
	 * Initialize color picker
	 */
	if (typeof jQuery.wp === 'object' && typeof jQuery.wp.wpColorPicker === 'function') {
		$('input:text.cmb_colorpicker').wpColorPicker();
	} else {
		$('input:text.cmb_colorpicker').each(function (i) {
			$(this).after('<div id="picker-' + i + '" style="z-index: 1000; background: #EEE; border: 1px solid #CCC; position: absolute; display: block;"></div>');
			$('#picker-' + i).hide().farbtastic($(this));
		})
		.focus(function () {
			$(this).next().show();
		})
		.blur(function () {
			$(this).next().hide();
		});
	}

	/**
	 * File and image upload handling
	 */


	$('.cmb_metabox')
	.on( 'change', '.cmb_upload_file', function () {
		formfield = $(this).attr('name');
		$('#' + formfield + '_id').val("");
	})
	.on( 'click', '.cmb_upload_button', function (event) {

		event.preventDefault();

		var self = $(this);
		formfield = self.prev('input').attr('name');
		var $formfield = $('#'+formfield);
		var uploadStatus = true;
		var attachment = true;

		// If the media frame already exists, reopen it.
		if ( file_frame ) {
			file_frame.open();
			return;
		}

		// Create the media frame.
		file_frame = wp.media.frames.file_frame = wp.media({
			title: $('label[for=' + formfield + ']').text(),
			button: {
				text: window.cmb_l10.upload_file
			},
			multiple: false
		});

		// When an file is selected, run a callback.
		file_frame.on( 'select', function() {

			// Only get one file from the uploader
			attachment = file_frame.state().get('selection').first().toJSON();

			$formfield.val(attachment.url);
			$('#'+ formfield +'_id').val(attachment.id);

			if ( attachment.type && attachment.type === 'image' ) {
				// image preview
				uploadStatus = '<div class="img_status"><img style="max-width: 350px; width: 100%; height: auto;" src="' + attachment.url + '" alt="'+ attachment.filename +'" title="'+ attachment.filename +'" /><p><a href="#" class="cmb_remove_file_button" rel="' + formfield + '">'+ cmb_l10.remove_image +'</a></p></div>';
			} else {
				// Standard generic output if it's not an image.
				uploadStatus = cmb_l10.file +' <strong>'+ attachment.filename +'</strong>&nbsp;&nbsp;&nbsp; (<a href="'+ attachment.url +'" target="_blank" rel="external">'+ cmb_l10.download +'</a> / <a href="#" class="cmb_remove_file_button" rel="'+ formfield +'">'+ cmb_l10.remove_file +'</a>)';
			}
			// add/display our output
			$formfield.siblings('.cmb_media_status').slideDown().html(uploadStatus);
		});

		// Finally, open the modal
		file_frame.open();
	})
	.on( 'click', '.cmb_remove_file_button', function (event) {
		formfield = $(this).attr('rel');
		var container = $(this).parents('.cmb_media_status');
		$('input#' + formfield).val('');
		$('input#' + formfield + '_id').val('');
		container.html('');
		return false;
	})
	.on( 'click', '.add-row-button', function(e) {

		e.preventDefault();
		self = $(this);

		var tableselector = '#'+ self.data('selector');
		var $table = $(tableselector);
		var row = $('.empty-row', $table).clone(true);
		row.removeClass('empty-row').addClass('repeat-row');
		row.insertBefore( tableselector +' tbody>tr:last' );
		var input = $('input.cmb_datepicker',row);
		var id = input.attr('id');
		input.attr('id', id + iterator );
		iterator++;

		// @todo Make a colorpicker field repeatable
		// row.find('.wp-color-result').remove();
		// row.find('input:text.cmb_colorpicker').wpColorPicker();

	})
	.on( 'click', '.remove-row-button', function(e) {
		e.preventDefault();
		var $self = $(this);
		var $parent = $self.parents('.cmb-repeat-table');
		console.log( 'number of tbodys', $parent.length );
		console.log( 'number of trs', $('tr', $parent).length );
		if ( $('tr', $parent).length > 2 )
			$self.parents('.cmb-repeat-table tr').remove();
	})

	/**
	 * Ajax oEmbed display
	 */

	// ajax when typing
	.on( 'keyup', '.cmb_oembed', function (event) {
		// fire our ajax function
		doCMBajax($(this), event);
	});

	// ajax on paste
	$('.cmb_oembed').bind( 'paste', function (e) {
		var pasteitem = $(this);
		// paste event is fired before the value is filled, so wait a bit
		setTimeout(function () {
			// fire our ajax function
			doCMBajax(pasteitem, 'paste');
		}, 100);
	}).blur(function () {
		// when leaving the input
		setTimeout(function () {
			// if it's been 2 seconds, hide our spinner
			$('.postbox table.cmb_metabox .cmb-spinner').hide();
		}, 2000);
	});

	// function for running our ajax
	function doCMBajax(obj, e) {
		// get typed value
		var oembed_url = obj.val();
		// only proceed if the field contains more than 6 characters
		if (oembed_url.length < 6)
			return;

		// only proceed if the user has pasted, pressed a number, letter, or whitelisted characters
		if (e === 'paste' || e.which <= 90 && e.which >= 48 || e.which >= 96 && e.which <= 111 || e.which == 8 || e.which == 9 || e.which == 187 || e.which == 190) {

			// get field id
			var field_id = obj.attr('id');
			// get our inputs context for pinpointing
			var context = obj.parents('.cmb_metabox tr td');

			var embed_container = $('.embed_status', context);
			var oembed_width = obj.width();
			var child_el = $(':first-child', embed_container);

			oembed_width = ( embed_container.length && child_el.length )
				? child_el.width()
				: obj.width();

			// show our spinner
			$('.cmb-spinner', context).show();
			// clear out previous results
			$('.embed_wrap', context).html('');
			// and run our ajax function
			setTimeout(function () {
				// if they haven't typed in 500 ms
				if ($('.cmb_oembed:focus').val() != oembed_url)
					return;
				$.ajax({
					type : 'post',
					dataType : 'json',
					url : window.cmb_l10.ajaxurl,
					data : {
						'action': 'cmb_oembed_handler',
						'oembed_url': oembed_url,
						'oembed_width': oembed_width > 300 ? oembed_width : 300,
						'field_id': field_id,
						'object_id': window.cmb_l10.object_id,
						'object_type': window.cmb_l10.object_type,
						'cmb_ajax_nonce': window.cmb_l10.ajax_nonce
					},
					success: function (response) {
						// Make sure we have a response id
						if (typeof response.id === 'undefined')
							return;

						// hide our spinner
						$('.cmb-spinner', context).hide();
						// and populate our results from ajax response
						$('.embed_wrap', context).html(response.result);
					}
				});

			}, 500);
		}
	}

	/**
	 * Resize oEmbed videos to fit in their respective metaboxes
	 */
	function resizeoEmbeds() {
		$('table.cmb_metabox').each(function( index ) {
			var self = $(this);
			var parents = self.parents('.inside');
			if ( ! ( parents.length > 0 ) )
				return true; // continue

			var tWidth = parents.width();
			var newWidth = Math.round((tWidth * 0.82)*0.97) - 30;
			if ( newWidth > 639 )
				return true; // continue

			var child_el = $('.cmb-type-oembed .embed_status', self).children().first();;
			var iwidth = child_el.width();
			var iheight = child_el.height();
			var newHeight = Math.round((newWidth * iheight)/iwidth);
			child_el.width(newWidth).height(newHeight);

		});
	}

	// on pageload
	setTimeout( resizeoEmbeds, 500);
	// and on window resize
	$(window).on( 'resize', resizeoEmbeds );

});