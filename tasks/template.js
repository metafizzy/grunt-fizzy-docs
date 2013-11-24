var path = require('path');
var handlebars = require('handlebars');
var marked = require('marked');

var highlight = require('./utils/highlight');
var parseJSONFrontMatter = require('./utils/parse-json-front-matter');

// -------------------------- Handlebar Helpers -------------------------- //

// https://gist.github.com/meddulla/2571518
handlebars.registerHelper( 'if_equal', function( a, b, options ) {
  if ( a == b ) {
    return options.fn( this );
  }
});

handlebars.registerHelper( 'slug', function( str ) {
  return str.replace( /[?]/, '' ).replace( /[\., ]+/gi, '-' ).toLowerCase();
});

// --------------------------  -------------------------- //

module.exports = function( grunt ) {

  grunt.registerMultiTask( 'template', 'Generate Handlebars templates', function() {
    var opts = this.options();

    // register any helpers
    for ( var helperName in opts.helpers ) {
      handlebars.registerHelper( helperName, opts.helpers[ helperName ] );
    }

    var templateFiles = grunt.file.expand( opts.templates );
    // hash of Handlebar templates
    var templates = {};
    templateFiles.forEach( function( filepath ) {
      var name = path.basename( filepath, path.extname( filepath ) );
      var src = grunt.file.read( filepath );
      templates[ name ] = handlebars.compile( src );
      // register all as partials
      handlebars.registerPartial( name, src );
    });

    // register any partial files
    for ( var partialName in opts.partialFiles ) {
      var partialFile = opts.partialFiles[ partialName ];
      var content = marked( grunt.file.read( partialFile ) );
      handlebars.registerPartial( partialName, content );
    }

    // properties made available for templating
    var dataDir = grunt.config.get('dataDir');
    var site = {};
    // read file paths from JSON
    site.css = grunt.file.expand( grunt.file.readJSON( dataDir + '/css-sources.json' ) );
    site.js = grunt.file.expand( grunt.file.readJSON( dataDir + '/js-sources.json' ) );

    this.files.forEach( function( file ) {
      file.src.forEach( function( filepath ) {
        // first process page source
        var src = grunt.file.read( filepath );
        var parsed = parseJSONFrontMatter( src );
        src = parsed.src;
        var pageJson = parsed.json || {};
        var context = {
          site: site,
          basename: path.basename( filepath, path.extname( filepath ) ),
          page: pageJson,
          isDev: grunt.option('dev')
        };
        // compile content
        var content = handlebars.compile( src )( context );
        content = highlight( content );
        context.content = content;

        // process source into page template
        var splitPath = filepath.split( path.sep );
        // remove leading directory
        if ( splitPath.length > 1 ) {
          splitPath.splice( 0, 1 );
        }
        var templated = templates[ opts.defaultTemplate ]( context );
        var dest = file.dest + splitPath.join( path.sep );
        grunt.file.write( dest, templated );
      });
    });
  });

};
