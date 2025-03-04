"use strict";

const JSON_URL = "data/cultsboons.json";

window.onload = function load () {
	ExcludeUtil.pInitialise(); // don't await, as this is only used for search
	SortUtil.initHandleFilterButtonClicks();
	DataUtil.loadJSON(JSON_URL).then(onJsonLoad);
};

function cultBoonTypeToFull (type) {
	return type === "c" ? "Cult" : "Demonic Boon";
}

let cultsAndBoonsList;
const sourceFilter = getSourceFilter();
let filterBox;
let list;
async function onJsonLoad (data) {
	list = ListUtil.search({
		valueNames: ['name', "source", "type", "uniqueid"],
		listClass: "cultsboons",
		sortFunction: SortUtil.listSort
	});

	const typeFilter = new Filter({
		header: "Type",
		items: ["b", "c"],
		displayFn: cultBoonTypeToFull
	});
	filterBox = await pInitFilterBox({
		filters: [
			sourceFilter,
			typeFilter
		]
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
		valueNames: ["type", "name", "source", "id"],
		listClass: "subcultsboons",
		getSublistRow: getSublistItem
	});
	ListUtil.initGenericPinnable();

	RollerUtil.addListRollButton();
	ListUtil.addListShowHide();

	data.cult.forEach(it => it._type = "c");
	data.boon.forEach(it => it._type = "b");
	cultsAndBoonsList = data.cult.concat(data.boon);

	let tempString = "";
	cultsAndBoonsList.forEach((it, bcI) => {
		tempString += `
			<li class="row" ${FLTR_ID}="${bcI}" onclick="ListUtil.toggleSelected(event, this)" oncontextmenu="ListUtil.openContextMenu(event, this)">
				<a id="${bcI}" href="#${UrlUtil.autoEncodeHash(it)}" title="${it.name}">
					<span class="type col-3 text-align-center pl-0">${cultBoonTypeToFull(it._type)}</span>
					<span class="name col-7">${it.name}</span>
					<span class="source col-2 text-align-center ${Parser.sourceJsonToColor(it.source)} pr-0" title="${Parser.sourceJsonToFull(it.source)}" ${BrewUtil.sourceJsonToStyle(it.source)}>${Parser.sourceJsonToAbv(it.source)}</span>
					
					<span class="uniqueid hidden">${it.uniqueId ? it.uniqueId : bcI}</span>
				</a>
			</li>`;

		// populate filters
		sourceFilter.addItem(it.source);
	});
	const lastSearch = ListUtil.getSearchTermAndReset(list);
	$("ul.cultsboons").append(tempString);

	list.reIndex();
	if (lastSearch) list.search(lastSearch);
	list.sort("type");

	filterBox.render();
	handleFilterChange();

	ListUtil.setOptions({
		itemList: cultsAndBoonsList,
		primaryLists: [list]
	});
	ListUtil.bindPinButton();
	Renderer.hover.bindPopoutButton(cultsAndBoonsList);
	UrlUtil.bindLinkExportButton(filterBox);
	ListUtil.bindDownloadButton();
	ListUtil.bindUploadButton();

	History.init(true);
}

// filtering function
function handleFilterChange () {
	const f = filterBox.getValues();
	list.filter(function (item) {
		const cb = cultsAndBoonsList[$(item.elm).attr(FLTR_ID)];
		return filterBox.toDisplay(
			f,
			cb.source,
			cb._type
		);
	});
	FilterBox.selectFirstVisible(cultsAndBoonsList);
}

function getSublistItem (it, pinId) {
	return `
		<li class="row" ${FLTR_ID}="${pinId}" oncontextmenu="ListUtil.openSubContextMenu(event, this)">
			<a href="#${UrlUtil.autoEncodeHash(it)}" title="${it.name}">
				<span class="name col-12 px-0">${it.name}</span>
				<span class="id hidden">${pinId}</span>
			</a>
		</li>
	`;
}

const renderer = Renderer.get();
function loadhash (id) {
	renderer.setFirstSection(true);

	const it = cultsAndBoonsList[id];

	const renderStack = [];
	if (it._type === "c") {
		Renderer.cultboon.doRenderCultParts(it, renderer, renderStack);
		renderer.recursiveRender({entries: it.entries}, renderStack, {depth: 2});

		$("#pagecontent").html(`
			${Renderer.utils.getBorderTr()}
			${Renderer.utils.getNameTr(it)}
			<tr id="text"><td class="divider" colspan="6"><div></div></td></tr>
			<tr class='text'><td colspan='6' class='text'>${renderStack.join("")}</td></tr>
			${Renderer.utils.getPageTr(it)}
			${Renderer.utils.getBorderTr()}
		`);
	} else if (it._type === "b") {
		it._displayName = it._displayName || `Demonic Boon: ${it.name}`;
		Renderer.cultboon.doRenderBoonParts(it, renderer, renderStack);
		renderer.recursiveRender({entries: it.entries}, renderStack, {depth: 1});
		$("#pagecontent").html(`
			${Renderer.utils.getBorderTr()}
			${Renderer.utils.getNameTr(it)}
			<tr class='text'><td colspan='6'>${renderStack.join("")}</td></tr>
			${Renderer.utils.getPageTr(it)}
			${Renderer.utils.getBorderTr()}
		`);
	}

	ListUtil.updateSelected();
}

function loadsub (sub) {
	sub = filterBox.setFromSubHashes(sub);
	ListUtil.setFromSubHashes(sub);
}
