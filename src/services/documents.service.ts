import * as $ from 'jquery';
import * as _ from 'lodash';
import * as bluebutton from 'bluebutton';
import { Document, Section, ViewerOptions, Preferences } from '../models';
import { SECTIONS, IGNORE_SECTIONS } from '../config';
import { PreferencesService } from './preferences.service';

export interface DocumentsServiceConfig {
  headers?: { [key: string]: string };
}

export class DocumentsService {

  config: DocumentsServiceConfig = {};

  setHeaders(headers: { [key: string]: string }) {
    this.config.headers = headers;
  }

  getSections(bb: any, sections: Section[], ignoreSections: string[], pref: Preferences): Section[] {

    let allSections = [];
    _.each(bb.data, (val, key) => {
      if (_.includes(ignoreSections, key)) return;
      let match = _.find(sections, s => s.key === key);
      if (match) {
        match.sort = pref.indexOfSection(key);
        allSections.push(match);
      }
      else allSections.push({
        key: key,
        display: val.displayName || key,
        tagName: 'generic',
        icon: 'asterisk',
        sort: pref.indexOfSection(key)
      });
    });

    // sort by name first, then by sort order
    allSections = _.sortBy(allSections, s => s.display.toLowerCase());
    allSections = _.sortBy(allSections, s => s.sort);

    // init sort and enabled
    _.each(allSections, (val, index) => {
      val.enabled = pref.isSectionEnabled(val.key);
    });

    return allSections;
  }

  fetch(document: Document): Promise<string> {
    return new Promise((resolve, reject) => {
      $.get({
        url: document.url,
        headers: this.config.headers || {},
        dataType: 'text',
        success: (content) => resolve(content),
        error: (err) => reject(err)
      });
    });
  }

  open(document: Document): Promise<ViewerOptions> {
    if (document.content)
      return Promise.resolve(this.load(document.content));
    return this.fetch(document).then(x => this.load(x));
  }

  load(data: any): ViewerOptions {
    let bb = bluebutton(data);
    if (!bb.data) throw 'BlueButton could not parse the file.';

    let pref = new PreferencesService().getPreferences(bb.data.document.type);

    return {
      sections: this.getSections(bb, SECTIONS, IGNORE_SECTIONS, pref),
      data: bb.data,
      pref: pref,
    };
  }
}
