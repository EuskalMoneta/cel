var webpack = require('webpack')
var path = require('path')
// Plugin Webpack pour la traduction
var I18nPlugin = require("i18n-webpack-plugin")

// Liste des langues disponibles dans notre application
var languages = {
    "fr": null,
    "eu": require('./static/locales/eu.json')  // Fichier de traduction
}

// if env var NODE_ENV === 'production', it will uglify/minify our JS codebase
// if this is anything else, it will not: and we will be in 'dev' mode (.js files will be *MUCH LARGER*)
var isProd = (process.env.NODE_ENV === 'production')

module.exports = Object.keys(languages).map(function(language) {

    // Conditionally return a list of plugins to use based on the current environment.
    // Repeat this pattern for any other config key (ie: loaders, etc).
    function getPlugins() {
        var plugins = [];

        // Always expose NODE_ENV to webpack, you can now use `process.env.NODE_ENV`
        // inside your code for any environment checks; UglifyJS will automatically
        // drop any unreachable code.
        plugins.push(
            new webpack.EnvironmentPlugin([
                'NODE_ENV'
            ]),
            // makes our dependencies available in every module
            new webpack.ProvidePlugin({
                Promise: 'imports?this=>global!exports?global.Promise!es6-promise',
                fetch: 'imports?this=>global!exports?global.fetch!whatwg-fetch',
                Raven: 'raven-js',
                React: 'react',
                ReactDOM: 'react-dom',
                ReactToastr: 'react-toastr',
                Formsy: 'formsy-react',
                FRC: 'formsy-react-components',
                moment: 'moment',
                "_": 'underscore'
            }),
            new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /fr|eu/),
            new I18nPlugin(
                languages[language]
            )
        );

        // Conditionally add plugins for Production builds.
        if (isProd) {
            plugins.push(new webpack.optimize.UglifyJsPlugin());
        }

        return plugins;
    }

    return {
        // the base directory (absolute path) for resolving the entry option
        context: __dirname,

        // If you have a big problem on the front-side (with React, etc ...)
        // You can activate this, its generates the .map for the bundles,
        // and using Chrome this helps a LOT to locate where the problem is in your code exactly:
        // ^^^               ^^^
        // devtool: 'source-map',

        // Liste des pages/scripts React qui composent notre application,
        // Pour chaque fichier .jsx servant nos pages, nous devons le déclarer ici !
        // A noter l'exception des Utils et autres dépendances que nous codons et importons nous-même
        // Voir la section sur les alias dans ce fichier de config
        entry: {
            Base: './static/js/base',
            FirstTime: './static/js/first-time',
            ChangePassword: './static/js/change-password',
            LostPassword: './static/js/lost-password',
            ValidToken: './static/js/valid-token',
            Profil: './static/js/profil',
            Login: './static/js/login',
            History: './static/js/history',
            Overview: './static/js/overview',
            Beneficiaires: './static/js/beneficiaires',
            Ponctuel: './static/js/ponctuel',
            EuskoKart: './static/js/euskokart',
            Reconvert: './static/js/reconvert',
            CompteRecharger: './static/js/compte-recharger',
            AcceptCGU: './static/js/accepte-cgu',
            Association: './static/js/association',
            Cotisation: './static/js/cotisation',
        },

        // Où vont se situer le résultat de la compilation effectuée par Webpack (nos bundles utilisés par notre navigateur)
        // Ici: /assets/bundles/js/<langue>.<nom_script>.js
        output: {
            // where you want your compiled bundle to be stored
            path: '/assets/bundles/',
            // naming convention webpack should use for your files
            filename: 'js/'+ language + '.[name].js',
        },

        // Modules externes utilisés par nos pages/scripts React
        plugins: getPlugins(),

        // Les modules permettent à Webpack de charger d'autres types de données que le JavaScript (JSX dans notre cas)
        // Babel est le nom du compilateur utilisé par Webpack pour compiler notre JSX
        // Webpack permet également de charger nos feuilles de styles (CSS), entre autres polices, SVG, etc...
        module: {
            loaders: [
                // a regexp that tells webpack use the following loaders on all
                // .js and .jsx files
                {
                    test: /\.jsx?$/,
                    // we definitely don't want babel to transpile all the files in
                    // node_modules. That would take a long time.
                    exclude: /node_modules/,
                    // use the babel loader
                    loader: 'babel',
                    query: {
                        "presets": ["es2015", "stage-0", "react"]
                    }
                },
                // Classic CSS + SASS preprocessor
                {
                    test: /\.css$/,
                    exclude: /\.useable\.css$/,
                    loaders: ['style', 'css']
                },
                {
                    test: /\.useable\.css$/,
                    loaders: ['style/useable', 'css']
                },
                {
                    test: /\.scss$/,
                    loaders: ["style", "css?sourceMap", "sass?sourceMap"]
                },
                {
                    test: /\.json/,
                    loader: 'json-loader'
                },
                // We want to use bootstrap
                // Bootstrap is based on webfonts / svg and other cool things
                // We need webpack to handle those for us
                {
                    test: /\.svg/,
                    loader: 'svg-url-loader'
                },
                {
                    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    loader: "url-loader?limit=10000&mimetype=application/font-woff"
                },
                {
                    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    loader: "file-loader"
                }
            ]
        },
        // Url-loader permet de charger des petits fichiers sous forme Base64 (comme les images, par exemple)
        // Ce paramètre est la limite de taille de ces fichiers...
        // Car nous ne voulons pas que nos bundles JS soit trop gros à l'arrivée
        url: {
            dataUrlLimit: 1024 // 1 kB
        },

        // Cette partie de la config, explique à Webpack la manière avec laquelle il va devoir trouver nos fichiers
        resolve: {
            root: path.resolve(__dirname),

            // Ceci est différent de la partie sur la liste des pages/scripts React qui composent notre application
            // Les alias sont les dépendances que nous écrivons pour notre propre code
            // Que nous pourrons importer depuis celui-ci (comme les Utils ou une modale utilisés un peu partout)
            alias: {
                Utils: 'static/js/utils',
                Modal: 'static/js/modal',
            },

            // tells webpack where to look for modules
            modulesDirectories: ['node_modules'],
            // extensions that should be used to resolve modules
            extensions: ['', '.js', '.jsx']
        }
    }
})