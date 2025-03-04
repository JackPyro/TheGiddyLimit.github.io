"use strict";

const JSON_URL = "data/optionalfeatures.json";

window.onload = async function load () {
	await ExcludeUtil.pInitialise();
	SortUtil.initHandleFilterButtonClicks();
	DataUtil.loadJSON(JSON_URL).then(onJsonLoad);
};

function optFeatSort (itemA, itemB, options) {
	if (options.valueName === "level") {
		const aValue = Number(itemA.values().level.toLowerCase()) || 0;
		const bValue = Number(itemB.values().level.toLowerCase()) || 0;
		return SortUtil.ascSort(aValue, bValue) || SortUtil.listSort(itemA, itemB, options);
	}
	return SortUtil.listSort(itemA, itemB, options);
}

function filterFeatureTypeSort (a, b) {
	return SortUtil.ascSort(Parser.optFeatureTypeToFull(a.item), Parser.optFeatureTypeToFull(b.item))
}

let list;
const sourceFilter = getSourceFilter();
const typeFilter = new Filter({
	header: "Feature Type",
	items: ["AI", "ED", "EI", "MM", "MV:B", "OTH", "FS:F", "FS:B", "FS:P", "FS:R", "PB"],
	displayFn: Parser.optFeatureTypeToFull,
	itemSortFn: filterFeatureTypeSort
});
const pactFilter = new Filter({
	header: "Pact Boon",
	items: ["Blade", "Chain", "Tome"],
	displayFn: Parser.prereqPactToFull
});
const patronFilter = new Filter({
	header: "Otherworldly Patron",
	items: ["The Archfey", "The Fiend", "The Great Old One", "The Hexblade", "The Kraken", "The Raven Queen", "The Seeker"],
	displayFn: Parser.prereqPatronToShort
});
const spellFilter = new Filter({
	header: "Spell",
	items: ["eldritch blast", "hex/curse"],
	displayFn: StrUtil.toTitleCase
});
const featureFilter = new Filter({
	header: "Feature",
	displayFn: StrUtil.toTitleCase
});
const levelFilter = new Filter({
	header: "Level",
	itemSortFn: SortUtil.ascSortNumericalSuffix,
	nests: []
});
const prerequisiteFilter = new MultiFilter({header: "Prerequisite", filters: [pactFilter, patronFilter, spellFilter, levelFilter, featureFilter]});
let filterBox;
async function onJsonLoad (data) {
	filterBox = await pInitFilterBox({filters: [sourceFilter, typeFilter, prerequisiteFilter]});

	list = ListUtil.search({
		valueNames: ["name", "source", "prerequisite", "level", "type", "uniqueid"],
		listClass: "optfeatures",
		sortFunction: optFeatSort
	});

	const $outVisibleResults = $(`.lst__wrp-search-visible`);
	list.on("updated", () => {
		$outVisibleResults.html(`${list.visibleItems.length}/${list.items.length}`);
	});

	// filtering function
	$(filterBox).on(
		FilterBox.EVNT_VALCHANGE,
		handleFilterChange
	);

	const subList = ListUtil.initSublist({
		valueNames: ["name", "ability", "prerequisite", "level", "id"],
		listClass: "suboptfeatures",
		getSublistRow: getSublistItem,
		sortFunction: optFeatSort
	});
	ListUtil.initGenericPinnable();

	addOptionalfeatures(data);
	BrewUtil.pAddBrewData()
		.then(handleBrew)
		.then(() => BrewUtil.bind({list}))
		.then(() => BrewUtil.pAddLocalBrewData())
		.catch(BrewUtil.pPurgeBrew)
		.then(async () => {
			BrewUtil.makeBrewButton("manage-brew");
			BrewUtil.bind({filterBox, sourceFilter});
			await ListUtil.pLoadState();
			RollerUtil.addListRollButton();
			ListUtil.addListShowHide();

			History.init(true);
			ExcludeUtil.checkShowAllExcluded(optfList, $(`#pagecontent`));
		});
}

function handleBrew (homebrew) {
	addOptionalfeatures(homebrew);
	return Promise.resolve();
}

let optfList = [];
let ivI = 0;
function addOptionalfeatures (data) {
	if (!data.optionalfeature || !data.optionalfeature.length) return;

	optfList = optfList.concat(data.optionalfeature);

	let tempString = "";
	for (; ivI < optfList.length; ivI++) {
		const it = optfList[ivI];
		if (ExcludeUtil.isExcluded(it.name, "optionalfeature", it.source)) continue;

		it.featureType = it.featureType || "OTH";
		if (it.prerequisite) {
			it._sPrereq = true;
			it._fPrereqPact = it.prerequisite.filter(it => it.type === "prereqPact").map(it => {
				pactFilter.addItem(it.entry);
				return it.entry;
			});
			it._fPrereqPatron = it.prerequisite.filter(it => it.type === "prereqPatron").map(it => {
				patronFilter.addItem(it.entry);
				return it.entry;
			});
			it._fprereqSpell = it.prerequisite.filter(it => it.type === "prereqSpell").map(it => {
				spellFilter.addItem(it.entries);
				return it.entries;
			});
			it._fprereqFeature = it.prerequisite.filter(it => it.type === "prereqFeature").map(it => {
				featureFilter.addItem(it.entries);
				return it.entries;
			});
			it._fPrereqLevel = it.prerequisite.filter(it => it.type === "prereqLevel").map(lvl => {
				const item = new FilterItem({
					item: `${lvl.class.name}${lvl.subclass ? ` (${lvl.subclass.name})` : ""} Level ${lvl.level}`,
					nest: lvl.class.name
				});
				levelFilter.addNest(lvl.class.name, {isHidden: true});
				levelFilter.addItem(item);
				return item;
			});
		}

		if (it.featureType instanceof Array) {
			it._dFeatureType = it.featureType.map(ft => Parser.optFeatureTypeToFull(ft));
			it._lFeatureType = it.featureType.join(", ");
			it.featureType.sort((a, b) => SortUtil.ascSortLower(Parser.optFeatureTypeToFull(a), Parser.optFeatureTypeToFull(b)));
		} else {
			it._dFeatureType = Parser.optFeatureTypeToFull(it.featureType);
			it._lFeatureType = it.featureType;
		}

		tempString += `
			<li class="row" ${FLTR_ID}="${ivI}" onclick="ListUtil.toggleSelected(event, this)" oncontextmenu="ListUtil.openContextMenu(event, this)">
				<a id="${ivI}" href="#${UrlUtil.autoEncodeHash(it)}" title="${it.name}">
					<span class="name col-3-2 pl-0">${it.name}</span>
					<span class="type col-1-5 text-align-center type" title="${it._dFeatureType}">${it._lFeatureType}</span>
					<span class="prerequisite col-4-8">${Renderer.optionalfeature.getPrerequisiteText(it.prerequisite, true)}</span>
					<span class="level col-1 text-align-center">${Renderer.optionalfeature.getListPrerequisiteLevelText(it.prerequisite)}</span>
					<span class="source col-1-5 ${Parser.sourceJsonToColor(it.source)} text-align-center pr-0" title="${Parser.sourceJsonToFull(it.source)}" ${BrewUtil.sourceJsonToStyle(it.source)}>${Parser.sourceJsonToAbv(it.source)}</span>
					
					<span class="uniqueid hidden">${it.uniqueId ? it.uniqueId : ivI}</span>
				</a>
			</li>
		`;

		// populate filters
		sourceFilter.addItem(it.source);
		typeFilter.addItem(it.featureType);
	}
	const lastSearch = ListUtil.getSearchTermAndReset(list);
	$(`#optfeaturesList`).append(tempString);

	list.reIndex();
	if (lastSearch) list.search(lastSearch);
	list.sort("name");
	filterBox.render();
	handleFilterChange();

	ListUtil.setOptions({
		itemList: optfList,
		getSublistRow: getSublistItem,
		primaryLists: [list]
	});
	ListUtil.bindPinButton();
	Renderer.hover.bindPopoutButton(optfList);
	UrlUtil.bindLinkExportButton(filterBox);
	ListUtil.bindDownloadButton();
	ListUtil.bindUploadButton();
}

function handleFilterChange () {
	const f = filterBox.getValues();
	list.filter(function (item) {
		const it = optfList[$(item.elm).attr(FLTR_ID)];
		return filterBox.toDisplay(
			f,
			it.source,
			it.featureType,
			[
				it._fPrereqPact,
				it._fPrereqPatron,
				it._fprereqSpell,
				it._fPrereqLevel,
				it._fprereqFeature
			]
		);
	});
	FilterBox.selectFirstVisible(optfList);
}

function getSublistItem (it, pinId) {
	return `
		<li class="row" ${FLTR_ID}="${pinId}" oncontextmenu="ListUtil.openSubContextMenu(event, this)">
			<a href="#${UrlUtil.autoEncodeHash(it)}" title="${it.name}">
				<span class="name col-4 pl-0">${it.name}</span>
				<span class="source col-2 text-align-center type" title="${Parser.optFeatureTypeToFull(it.featureType)}">${it.featureType}</span>
				<span class="prerequisite col-4-5">${Renderer.optionalfeature.getPrerequisiteText(it.prerequisite, true)}</span>
				<span class="level col-1-5 pr-0">${Renderer.optionalfeature.getListPrerequisiteLevelText(it.prerequisite)}</span>
				
				<span class="id hidden">${pinId}</span>
			</a>
		</li>
	`;
}

function loadhash (jsonIndex) {
	Renderer.get().setFirstSection(true);
	const $content = $(`#pagecontent`).empty();
	const it = optfList[jsonIndex];

	const $wrpTab = $(`#stat-tabs`);
	$wrpTab.find(`.opt-feature-type`).remove();
	const $wrpOptFeatType = $(`<div class="opt-feature-type"/>`).prependTo($wrpTab);
	if (it.featureType instanceof Array) {
		const commonPrefix = MiscUtil.findCommonPrefix(it.featureType.map(fs => Parser.optFeatureTypeToFull(fs)));
		if (commonPrefix) $wrpOptFeatType.append(`${commonPrefix.trim()} `);
		it.featureType.forEach((ft, i) => {
			if (i > 0) $wrpOptFeatType.append("/");
			$(`<span class="roller">${Parser.optFeatureTypeToFull(ft).substring(commonPrefix.length)}</span>`)
				.click(() => {
					filterBox.setFromValues({"Feature Type": {[ft]: 1}});
					handleFilterChange();
				})
				.appendTo($wrpOptFeatType);
		});
	} else {
		$(`<span class="roller">${Parser.optFeatureTypeToFull(it.featureType)}</span>`)
			.click(() => {
				filterBox.setFromValues({"Feature Type": {[it.featureType]: 1}});
				handleFilterChange();
			})
			.appendTo($wrpOptFeatType);
	}

	$content.append(`
		${Renderer.utils.getBorderTr()}
		${Renderer.utils.getNameTr(it)}
		${it.prerequisite ? `<tr><td colspan="6"><i>${Renderer.optionalfeature.getPrerequisiteText(it.prerequisite)}</i></td></tr>` : ""}
		<tr><td class="divider" colspan="6"><div></div></td></tr>
		<tr><td colspan="6">${Renderer.get().render({entries: it.entries}, 1)}</td></tr>
		${Renderer.optionalfeature.getPreviouslyPrintedText(it)}
		${Renderer.utils.getPageTr(it)}
		${Renderer.utils.getBorderTr()}
	`);

	ListUtil.updateSelected();
}

function loadsub (sub) {
	sub = filterBox.setFromSubHashes(sub);
	ListUtil.setFromSubHashes(sub);
}
