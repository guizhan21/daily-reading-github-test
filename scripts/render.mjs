import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Markdown,{defaultUrlTransform} from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function renderMarkdown(source){
  // GFM autolinks otherwise absorb the adjacent Chinese citation/date suffix.
  // The source bytes and visible citation stay intact; only the link target is corrected.
  return renderToStaticMarkup(React.createElement(Markdown,{
    remarkPlugins:[remarkGfm],
    urlTransform:value=>defaultUrlTransform(value).split(encodeURI('；查閱日期：'))[0].split('；查閱日期：')[0],
    skipHtml:true,
    components:{a:props=>React.createElement('a',{...props,target:'_blank',rel:'noopener noreferrer'}),img:()=>React.createElement('em',null,'〔外部圖片不載入〕')},
  },source));
}
