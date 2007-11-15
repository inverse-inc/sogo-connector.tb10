PACKAGE = sogo-connector
VERSION = 0.62b

XPI_ARCHIVE = $(PACKAGE)-$(VERSION).xpi

SHELL = /bin/bash
ZIP = /usr/bin/zip

FILENAMES = $(shell cat MANIFEST)

all: MANIFEST-pre MANIFEST rest

MANIFEST: MANIFEST-pre
	@if ! cmp MANIFEST MANIFEST-pre >& /dev/null; then \
	  mv -f MANIFEST-pre MANIFEST; \
	  echo MANIFEST updated; \
	else \
	  rm -f MANIFEST-pre; \
	fi;

MANIFEST-pre:
	@echo chrome.manifest > $@
	@echo install.rdf >> $@
	@echo COPYING >> $@
	@echo ChangeLog >> $@
	@find -type f -name "*.xul" >> $@
	@find -type f -name "*.xml" >> $@
	@find -type f -name "*.dtd" >> $@
	@find -type f -name "*.js" >> $@
	@find -type f -name "*.css" >> $@
	@find -type f -name "*.png" >> $@
	@find -type f -name "*.gif" >> $@
	@find -type f -name "*.jpg" >> $@
	@find -type f -name "*.xpt" >> $@

rest:
	@make $(XPI_ARCHIVE)

$(XPI_ARCHIVE): $(FILENAMES)
	@echo Generating $(XPI_ARCHIVE)...
	@rm -f $(XPI_ARCHIVE)
	@$(ZIP) -9r $(XPI_ARCHIVE) $(FILENAMES) > /dev/null

clean:
	rm -f MANIFEST-pre $(XPI_ARCHIVE)
	find -name "*~" -exec rm -f {} \;

distclean: clean
	rm -f MANIFEST

