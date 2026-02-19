import React from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';

export interface DataTableProps<T extends object> extends TableProps<T> {
  pageSize?: number;
}

export function DataTable<T extends object>({
  pageSize = 10,
  pagination,
  ...props
}: DataTableProps<T>) {
  return (
    <Table<T>
      size="middle"
      pagination={
        pagination === false
          ? false
          : {
              pageSize,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
              pageSizeOptions: ['10', '20', '50', '100'],
              ...((typeof pagination === 'object' ? pagination : {}) as object),
            }
      }
      {...props}
    />
  );
}
