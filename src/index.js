import path from 'path';
import postcss from 'postcss';
import getCustomPropertiesFromRoot from './lib/get-custom-properties-from-root';
import getCustomPropertiesFromImports from './lib/get-custom-properties-from-imports';
import transformProperties from './lib/transform-properties';
import writeCustomPropertiesToExports from './lib/write-custom-properties-to-exports';

export default postcss.plugin('postcss-custom-properties', opts => {
	// whether to preserve custom selectors and rules using them
	const preserve = 'preserve' in Object(opts) ? Boolean(opts.preserve) : true;

	// sources to import custom selectors from
	const importFrom = [].concat(Object(opts).importFrom || []);

	// destinations to export custom selectors to
	const exportTo = [].concat(Object(opts).exportTo || []);

	// synchronous transform
	const syncTransform = root => {
		const customProperties = getCustomPropertiesFromRoot(root, { preserve });

		transformProperties(root, customProperties, { preserve });
	};

	// asynchronous transform
	const asyncTransform = async (root, result) => {

		// adds dependency message for css-loader to notify webpack about imports
		// @see https://webpack.js.org/loaders/postcss-loader/#add-dependencies
		importFrom.forEach((source) => {
			if (!(typeof source === 'string' || source instanceof String)) return;

			result.messages.push({
				plugin: 'postcss-custom-properties',
				type: 'dependency',
				file: path.resolve(source),
			});
		});

		const customProperties = Object.assign(
			{},
			getCustomPropertiesFromRoot(root, { preserve }),
			await getCustomPropertiesFromImports(importFrom),
		);

		await writeCustomPropertiesToExports(customProperties, exportTo);

		transformProperties(root, customProperties, { preserve });
	};

	// whether to return synchronous function if no asynchronous operations are requested
	const canReturnSyncFunction = importFrom.length === 0 && exportTo.length === 0;

	return canReturnSyncFunction ? syncTransform : asyncTransform;
});
