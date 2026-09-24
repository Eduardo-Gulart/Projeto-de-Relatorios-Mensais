"use client";
const options=[
 ['Cardápio','Fotos dos produtos','Cardápio: atualização das fotos dos produtos.'],
 ['Cardápio','Nomes e descrições','Cardápio: revisão dos nomes e das descrições dos produtos.'],
 ['Cardápio','Organização das categorias','Cardápio: reorganização das categorias e dos destaques.'],
 ['Vendas','Combos e adicionais','Vendas: criação ou ajuste de combos e adicionais.'],
 ['Vendas','Cupons e promoções','Promoções: configuração de cupons e ofertas.'],
 ['Vendas','Preços dos produtos','Preços: revisão dos valores dos produtos.'],
 ['Divulgação','Anúncios no iFood','Divulgação: ativação ou ajuste de anúncios no iFood.'],
 ['Operação','Tempo de preparo','Operação: ajuste do tempo de preparo dos pedidos.'],
 ['Operação','Horários de funcionamento','Operação: atualização dos horários de funcionamento.'],
 ['Operação','Área e taxa de entrega','Entrega: revisão da área de atendimento e das taxas.'],
 ['Atendimento','Avaliações e chamados','Atendimento: acompanhamento de avaliações e chamados.'],
 ['Atendimento','Cancelamentos','Operação: análise dos cancelamentos e ajustes para evitar recorrências.'],
] as const;
export default function StrategyEditor({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const lines=value.split('\n');const chosen=options.filter(([, ,text])=>lines.includes(text)).map(([, ,text])=>text as string);
 const notes=lines.filter(line=>!options.some(([, ,text])=>text===line)).join('\n');
 const compose=(selected:string[],details:string)=>[...selected,...(details?[details]:[])].join('\n');
 return <div className="strategy-editor"><h3>Estratégias utilizadas</h3><p className="muted">Marque somente as ações realizadas neste período. O texto do relatório é montado automaticamente.</p><div className="strategy-groups">{[...new Set(options.map(([group])=>group))].map(group=><fieldset key={group}><legend>{group}</legend>{options.filter(([g])=>g===group).map(([,label,text])=><label className="strategy-option" key={text}><input type="checkbox" checked={chosen.includes(text)} onChange={e=>onChange(compose(e.target.checked?[...chosen,text]:chosen.filter(v=>v!==text),notes))}/><span>{label}</span></label>)}</fieldset>)}</div><label className="spaced">Outras ações ou detalhes (opcional)<textarea rows={3} value={notes} onChange={e=>onChange(compose(chosen,e.target.value))} placeholder="Ex.: cupom de R$ 5 aos finais de semana."/></label><details><summary>Ver texto que aparecerá no relatório ({chosen.length} ações marcadas)</summary>{value.trim()?<ul className="strategy-preview">{value.split('\n').filter(Boolean).map((line,i)=><li key={i}>{line}</li>)}</ul>:<p className="muted">Nenhuma estratégia informada.</p>}</details></div>;
}
