import type {ProjectMaster,ProjectQuoteSnapshot} from './project'

const istanbulDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'})

function quoteDay(value:string):string {
  const raw=String(value??'').trim()
  const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  const legacy=/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(raw)
  if(iso||legacy){
    const day=iso?raw:`${legacy![3]}-${legacy![2].padStart(2,'0')}-${legacy![1].padStart(2,'0')}`
    const parsed=new Date(day+'T00:00:00Z')
    return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===day?day:''
  }
  if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(raw))return ''
  const timestamp=Date.parse(raw)
  return Number.isFinite(timestamp)?istanbulDate.format(timestamp):''
}

export function quoteWindow(days=7,now=new Date()): (value:string)=>boolean {
  const last=istanbulDate.format(now)
  const start=new Date(last+'T00:00:00Z')
  start.setUTCDate(start.getUTCDate()-days+1)
  const first=start.toISOString().slice(0,10)
  return value=>{
    const day=quoteDay(value)
    return day>=first&&day<=last
  }
}

/** One logical quote per ID. Revisions reuse the root/source ID. */
export function recentProjectQuotes(projects:readonly ProjectMaster[],days=7,now=new Date()){
  const inWindow=quoteWindow(days,now)
  const quotes=new Map<string,{quote:ProjectQuoteSnapshot;day:string}>()
  for(const project of projects){
    for(const quote of project.quotes||[]){
      const id=quote.sourceQuoteId||quote.id
      if(!id||!inWindow(quote.date))continue
      const day=quoteDay(quote.date)
      if(day>=(quotes.get(id)?.day??''))quotes.set(id,{quote,day})
    }
  }
  return Array.from(quotes.values(),entry=>entry.quote)
}
