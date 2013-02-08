/* ===================================================
 * html5-filedrop.js v1.0
 * https://github.com/ncavig/html5-filedrop
 * ===================================================
 * Copyright 2012 Nic Cavigliano.
 *
 * Licensed under the BSD License (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://opensource.org/licenses/bsd-license.php
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * ========================================================== */

(function($) {
    var validateFileType = function(options, file) {
        if (!options.file_types) {
            return true;
        }
        if (options.file_types) {
            if ($.isArray(options.file_types)) {
                for (i in options.file_types) {
                    if (file.type.indexOf(options.file_types[i]) != -1) {
                        return true;
                    }
                }
            } else if (options.file_types.indexOf(file.type) != -1) {
                return true;
            }
        }
        options.error(null, file);
        return false;
    };
    var options = {};
    var methods = {
        init: function( opts ) {
            options = methods.setOptions(opts);

            return this.each(function() {
                var $this = $(this);

                $this.bind('dragenter', methods.dragEnter);
                $this.bind('dragover', methods.dragOver);
                $this.bind('dragleave', methods.dragLeave);
                $this.bind('drop dragdrop', methods.drop);
            });
        },

        setOptions: function(opts) {
            return {
                path    : opts.path || '/',
                hoverClass  : opts.hoverClass   || 'file-hover',
                dragEnter   : opts.dragEnter    || function() {},
                dragLeave   : opts.dragLeave    || function() {},
                dragOver    : opts.dragOver     || function() {},
                drop        : opts.drop         || function() {},
                success     : opts.success      || function() {},
                error       : opts.error        || function() {},
                progress    : opts.progress     || function() {},
                load        : opts.load         || function() {},
        beforeSend  : opts.beforeSend   || function() {},
                file_types  : opts.file_types   || null
            }
        },

        dragEnter: function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(this).addClass(options.hoverClass);

            options.dragEnter.call(this, e);

            return false;
        },

        dragLeave: function(e) {
            e.stopPropagation();
            e.preventDefault();
            $(this).removeClass(options.hoverClass);

            options.dragLeave.call(this, e);

            return false;
        },

        dragOver: function (e) {
            e.stopPropagation();
            e.preventDefault();

            options.dragOver.call(this, e);

            return false;
        },

        drop: function(e) {
            e.stopPropagation();
            e.preventDefault();
            $(this).removeClass(options.hoverClass);

      if (!e.originalEvent.dataTransfer || !e.originalEvent.dataTransfer.files) {
        options.error.call(this, e);
      }

            var files = e.originalEvent.dataTransfer.files;
            options.drop.call(this, e, files);

            // really should abstract this away since it's more of a specific drop action

            if (files && files.length > 0) {
                $.each(files, function ( i, file ) {
                    console.log(file);
                    if (validateFileType(options, file)) {
                        file.cleanFileName = (file.fileName || file.name).replace(/'/g, '');
                        var xhr    = new XMLHttpRequest();
                        var upload = xhr.upload;
                        var data   = new FormData();

                        data.append('file',file);
                        data.append('filename', file.cleanFileName);
                        // firefox doesnt like formdata?
                        var serializedData = "?filename="+file.cleanFileName;

                        // firefox also doesn't like late binding
                        upload.addEventListener('progress', function(e) {
                            options.progress.call(this, e, xhr, file);
                        }, false);
                        upload.addEventListener('load', function(e) {
                            options.load.call(this, e, xhr, file);
                        }, false);

                        xhr.open('POST', options.path+serializedData, true);
            options.beforeSend.call(xhr, data, file);

                        xhr.send(file);
                        xhr.onreadystatechange = function() {
                            if (xhr.readyState == 4) {
                                if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                                    response = JSON.parse(xhr.responseText);
                                    options.success.call(this, xhr, file, response);
                                } else {
                                    options.error.call(this, xhr, file);
                                }
                            }
                        }
                    }
                });
            };

            return false;
        }
    };

    $.fn.fileUploader = function( method ) {
        if ( methods[method] ) {
            return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        }
    };
})(jQuery);