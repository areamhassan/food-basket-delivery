import { Entity, Column, GridSettings, ColumnHashSet, } from "radweb";
import * as XLSX from 'xlsx';
import { HasAsyncGetTheValue, DateTimeColumn } from "../model-shared/types";
import { foreachSync } from "./utils";

export async function   saveToExcel<E extends Entity<any>,T extends GridSettings<E>>(grid:T,fileName:string,hideColumn?:(e:E,c:Column<any>)=>boolean)  {
  
    if (!hideColumn)
      hideColumn = ()=>false;
  
    let wb = XLSX.utils.book_new();
    
    wb.Workbook = { Views: [{ RTL: true }] };
    let ws = {
  
    } as XLSX.WorkSheet;
    var dc = new DateTimeColumn();
    dc.dateValue = new Date();
    ws["A1"] = {
      v: dc.displayValue,
      t: "d",
      w: "dd/mm/yyyy HH:MM"
  
    } as XLSX.CellObject;
    ws["A2"] = {
      f: "year(A1)"
  
    } as XLSX.CellObject;
    ws["!cols"] = [];
  
  
  
  
    let x = grid.page;
    let rowNum = 2;
    let maxChar = 'A';
  
  
    grid.page = 1;
    await grid.getRecords();
    while (grid.items.length > 0) {
      await foreachSync<Entity<any>>(grid.items
        , async  f => {
          let colPrefix = '';
          let colName = 'A';
          let colIndex = 0;
  
          let addColumn = (caption: string, v: string, t: XLSX.ExcelDataType, hidden?: boolean) => {
  
            if (rowNum == 2) {
              ws[colPrefix + colName + "1"] = { v: caption };
              ws["!cols"].push({
                wch: caption.length,
                hidden: hidden
              });
            }
  
            ws[colPrefix + colName + (rowNum.toString())] = {
              v: v, t: t
            };
            maxChar = colPrefix + colName;
            {
              let i = colName.charCodeAt(0);
              i++;
              colName = String.fromCharCode(i);
              if (colName > 'Z') {
                colName = 'A';
                colPrefix = 'A';
              }
            }
            let len = v.length;
            let col = ws["!cols"][colIndex++];
            if (len > col.wch) {
              col.wch = len;
            }
          };
  
          await foreachSync(f.__iterateColumns(), async c => {
            try {
  
              let v = c.displayValue;
              if (v == undefined)
                v = '';
              let getv: HasAsyncGetTheValue = <any>c as HasAsyncGetTheValue;
              if (getv && getv.getTheValue) {
                v = await getv.getTheValue();
              }
  
              if (c instanceof DateTimeColumn) {
                addColumn('תאריך ' + c.caption, c.dateValue ? c.getStringForInputDate() : undefined, "d", false);
                addColumn('שעת ' + c.caption, c.dateValue ? c.dateValue.getHours().toString() : undefined, "n", false);
                addColumn('מלא ' + c.caption, c.displayValue, "s", true);
              }
              else
                addColumn(c.caption, v.toString(), "s", hideColumn(<E>f ,c))
  
  
            } catch (err) {
  
              console.error(err, c.jsonName, f.__toPojo(new ColumnHashSet()));
            }
          });
          rowNum++;
  
        });
      await grid.nextPage();
    }
    grid.page = x;
    grid.getRecords();
    ws["!ref"] = "A1:" + maxChar + rowNum;
    ws["!autofilter"] = { ref: ws["!ref"] };
  
  
    XLSX.utils.book_append_sheet(wb, ws, 'test');
    XLSX.writeFile(wb, fileName+'.xlsx');
    
  }