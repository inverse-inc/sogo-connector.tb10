function SCExportTask(event) {
    var tree = getTaskTree();
    saveEventsToFile(tree.getSelectedItems({}));
}
